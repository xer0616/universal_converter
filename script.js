document.getElementById("file-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
        try {
            const content = await file.text();
            const fileType = file.name.split('.').pop().toLowerCase();
            document.getElementById("file-content").textContent = content;

            // Parse JSON
            let jsonData;
            try {
                if (fileType === 'json') {
                    jsonData = JSON.parse(content);
                } else if (fileType === 'csv') {
                    jsonData = csvToJson(content); // Convert CSV to JSON
                } else if (fileType === 'xml') {
                    jsonData = xmlToJson(content); // Convert XML to JSON
                } else {
                    throw new Error("Unsupported file type.");
                }
                updateStatus("File loaded and parsed successfully.");
            } catch (error) {
                updateStatus("Invalid JSON format. Please upload a valid JSON file.", true);
                return;
            }

            // Convert to other formats
            const jsonContent = JSON.stringify(jsonData, null, 2);
            const xmlContent = jsonToXml(jsonData);
            const yamlContent = jsonToYaml(jsonData);
            const csvContent = Array.isArray(jsonData) ? jsonToCsv(jsonData) : "JSON must be an array for CSV conversion.";

            // Update boxes
            document.getElementById("json-content").textContent = jsonContent;
            document.getElementById("xml-content").textContent = xmlContent;
            document.getElementById("yaml-content").textContent = yamlContent;
            document.getElementById("csv-content").textContent = csvContent;

            // Add download buttons
            addDownloadButton("download-json", "data.json", jsonContent);
            addDownloadButton("download-xml", "data.xml", xmlContent);
            addDownloadButton("download-yaml", "data.yaml", yamlContent);
            addDownloadButton("download-csv", "data.csv", csvContent);

            // Convert to ProtoBuf and MessagePack
            const protoBuf = await jsonToProtoBuf(jsonData); // Ensure ProtoBuf library is set up
            const messagePack = await jsonToMessagePack(jsonData); // Ensure MessagePack library is set up

            addDownloadButton("download-protobuf", "data.proto", protoBuf);
            addDownloadButton("download-messagepack", "data.msgpack", messagePack);

            updateStatus("All conversions completed successfully.");
        } catch (error) {
            updateStatus(`Error during processing: ${error.message}`, true);
        }
    }
});

function updateStatus(message, isError = false) {
    const statusBox = document.getElementById("status-box");
    statusBox.textContent = `Status: ${message}`;
    statusBox.style.backgroundColor = isError ? "#f8d7da" : "#d4edda"; // Red for errors, green for success
    statusBox.style.color = isError ? "#721c24" : "#155724"; // Red or green text
    statusBox.style.borderColor = isError ? "#f5c6cb" : "#c3e6cb";
}

function addDownloadButton(buttonId, filename, content) {
    const button = document.getElementById(buttonId);
    button.onclick = () => {
        const blob = new Blob([content], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    };
}

// Helper function to generate ProtoBuf schema from JSON data
function generateProtoSchema(jsonData) {
    let protoSchema = "syntax = \"proto3\";\n\nmessage Data {\n";
    let fieldCount = 1;
    let fieldNames = new Set(); // To track field names and avoid duplicates

    // Function to recursively analyze the data
    function analyzeObject(obj, parentKey = "") {
        if (Array.isArray(obj)) {
            // Handle arrays of objects (use repeated for arrays)
            const arrayFieldName = `${parentKey}_items`; // Ensure the array field name is unique
            protoSchema += `  repeated ${getProtoFieldType(obj[0])} ${arrayFieldName} = ${fieldCount++};\n`;  // Add repeated field for array
            obj.forEach(item => analyzeObject(item, `${parentKey}_item`));  // Recursively process each item in the array
        } else if (typeof obj === "object" && obj !== null) {
            // Handle objects (nested messages)
            for (const [key, value] of Object.entries(obj)) {
                const fieldType = getProtoFieldType(value);
                const fieldName = parentKey ? `${parentKey}_${key}` : key;  // Add parent key for nested structures

                // Ensure unique field names
                if (!fieldNames.has(fieldName)) {
                    protoSchema += `  ${fieldType} ${fieldName} = ${fieldCount++};\n`;
                    fieldNames.add(fieldName); // Mark the field name as used
                }
                analyzeObject(value, fieldName);  // Recursively process nested objects
            }
        } else {
            // Handle primitives
            const fieldType = getProtoFieldType(obj);
            const fieldName = parentKey || "primitiveField"; // Use a default name for primitives

            // Ensure unique field names
            if (!fieldNames.has(fieldName)) {
                protoSchema += `  ${fieldType} ${fieldName} = ${fieldCount++};\n`;
                fieldNames.add(fieldName); // Mark the field name as used
            }
        }
    }

    // Analyze the root object or array of objects
    if (Array.isArray(jsonData)) {
        protoSchema += "  repeated Data data = 1;\n"; // Wrap the array of objects in a repeated field
        jsonData.forEach(item => analyzeObject(item, "data"));
    } else {
        analyzeObject(jsonData);
    }

    protoSchema += "}\n";
    return protoSchema;
}

// Function to determine ProtoBuf field type based on the value's type
function getProtoFieldType(value) {
    if (Array.isArray(value)) {
        return "string"; // Simplified for demonstration; refine based on array contents
    } else if (typeof value === "string") {
        return "string";
    } else if (typeof value === "number") {
        return "float";
    } else if (typeof value === "boolean") {
        return "bool";
    } else if (typeof value === "object" && value !== null) {
        return "Data";  // This will assume that objects are of type `Data`
    }
    return "string";  // Default fallback type
}


function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

async function loadProtoSchema(schemaContent) {
    return new Promise((resolve, reject) => {
        try {
            // Parse the schema string to get the ProtoBuf root
            const root = protobuf.parse(schemaContent).root;

            // Check if the root contains the Data message
            const Data = root.lookupType("Data");
            if (!Data) {
                reject("ProtoBuf schema does not contain 'Data' message.");
                return;
            }

            // Successfully loaded the schema
            resolve(root);
        } catch (err) {
            console.error("ProtoBuf schema loading error: " + err.message);
            reject("ProtoBuf schema loading error: " + err.message);
        }
    });
}

async function jsonToProtoBuf(json) {
    const schemaContent = generateProtoSchema(json);
console.log('schema', schemaContent);
    return loadProtoSchema(schemaContent)
        .then(root => {
            // Get the Data message type from the schema
            const Data = root.lookupType("Data");

console.log('Data', Data);
            // Create a new message
            const message = Data.create(json); // Assume json is compatible with the schema
console.log('message', message);
            const buffer = Data.encode(message).finish(); // Encode the message to a buffer

console.log('buffer', buffer);
            resolve(buffer); // Return the buffer as ProtoBuf binary data
        })
        .catch(error => {
            console.error("Error loading ProtoBuf schema:", error);
        });
}

async function jsonToMessagePack(json) {
    return messagepackConverter(json);
}

function jsonToYaml(json) {
    return jsyaml.dump(json); // Requires js-yaml library
}

function jsonToCsv(json) {
    const keys = Object.keys(json[0]); // Assumes an array of objects
    const csvRows = [
        keys.join(','), // Header row
        ...json.map(row => keys.map(key => row[key]).join(',')) // Data rows
    ];
    return csvRows.join('\n');
}

function jsonToXml(json) {
    function convertToXml(obj, tagName = "root") {
        let xml = "";
        if (Array.isArray(obj)) {
            // Handle arrays
            obj.forEach((item) => {
                xml += `<${tagName}>${convertToXml(item)}</${tagName}>`;
            });
        } else if (typeof obj === "object" && obj !== null) {
            // Handle objects
            for (const [key, value] of Object.entries(obj)) {
                xml += `<${key}>${convertToXml(value, key)}</${key}>`;
            }
        } else {
            // Handle primitive values
            xml += obj;
        }
        return xml;
    }

    const rawXml = `<root>${convertToXml(json)}</root>`;
    return formatXml(rawXml); // Call the formatting function
}

function formatXml(xml) {
    const PADDING = "  "; // Define the indentation
    const lines = xml
        .replace(/>\s*</g, "><") // Remove existing whitespace between tags
        .replace(/</g, "\n<") // Insert newlines before tags
        .split("\n"); // Split into lines for processing

    let formatted = "";
    let indentLevel = 0;

    lines.forEach((line) => {
        if (line.startsWith("</")) {
            // Closing tag decreases indentation
            indentLevel--;
        }
        formatted += PADDING.repeat(indentLevel) + line.trim() + "\n";
        if (line.startsWith("<") && !line.startsWith("</") && !line.endsWith("/>")) {
            // Opening tag increases indentation
            indentLevel++;
        }
    });

    return formatted.trim(); // Remove trailing whitespace
}

function csvToJson(csv) {
    const lines = csv.split("\n");
    const keys = lines[0].split(",");
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const values = lines[i].split(",");
        keys.forEach((key, index) => {
            obj[key] = values[index];
        });
        result.push(obj);
    }
    return result;
}

// Helper function to convert XML to JSON
function xmlToJson(xml) {
    // Simple XML to JSON conversion (requires xml2js or similar library)
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, "application/xml");
    const json = xmlToJsonRecursive(xmlDoc.documentElement);
    return json;
}

function xmlToJsonRecursive(node) {
    const obj = {};
    if (node.nodeType === 1) {
        // Element node
        if (node.attributes.length > 0) {
            obj["attributes"] = {};
            for (let i = 0; i < node.attributes.length; i++) {
                const attribute = node.attributes.item(i);
                obj["attributes"][attribute.nodeName] = attribute.nodeValue;
            }
        }
    } else if (node.nodeType === 3) {
        // Text node
        obj["value"] = node.nodeValue;
    }

    if (node.hasChildNodes()) {
        for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];
            const nodeName = child.nodeName;
            if (obj[nodeName] === undefined) {
                obj[nodeName] = xmlToJsonRecursive(child);
            } else {
                if (Array.isArray(obj[nodeName])) {
                    obj[nodeName].push(xmlToJsonRecursive(child));
                } else {
                    obj[nodeName] = [obj[nodeName], xmlToJsonRecursive(child)];
                }
            }
        }
    }
    return obj;
}

