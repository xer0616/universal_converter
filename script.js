document.getElementById("file-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
        try {
            const content = await file.text();
            document.getElementById("file-content").textContent = content;

            // Parse JSON
            let jsonData;
            try {
                jsonData = JSON.parse(content);
                updateStatus("File loaded and parsed successfully.");
            } catch (error) {
                updateStatus("Invalid JSON format. Please upload a valid JSON file.", true);
                return;
            }

            // Convert to other formats
            const xmlContent = jsonToXml(jsonData);
            const yamlContent = jsonToYaml(jsonData);
            const csvContent = Array.isArray(jsonData) ? jsonToCsv(jsonData) : "JSON must be an array for CSV conversion.";

            // Update boxes
            document.getElementById("xml-content").textContent = xmlContent;
            document.getElementById("yaml-content").textContent = yamlContent;
            document.getElementById("csv-content").textContent = csvContent;

            // Add download buttons
            addDownloadButton("download-xml", "data.xml", xmlContent);
            addDownloadButton("download-yaml", "data.yaml", yamlContent);
            addDownloadButton("download-csv", "data.csv", csvContent);

            // Convert to ProtoBuf and MessagePack
            const protoBuf = jsonToProtoBuf(jsonData); // Ensure ProtoBuf library is set up
            const messagePack = jsonToMessagePack(jsonData); // Ensure MessagePack library is set up

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

async function jsonToProtoBuf(json) {
    return await protobufConverter(json);
}

async function jsonToMessagePack(json) {
    return await messagepackConverter(json);
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

    return `<root>${convertToXml(json)}</root>`;
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
