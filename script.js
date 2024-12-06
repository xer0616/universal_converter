document.getElementById("file-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
        try {
            const content = await file.text();
            document.getElementById("file-content").textContent = content;

            // Parse JSON and check for errors
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
            const csvContent = jsonToCsv(jsonData);

            // Update boxes
            document.getElementById("xml-content").textContent = xmlContent;
            document.getElementById("yaml-content").textContent = yamlContent;
            document.getElementById("csv-content").textContent = csvContent;

            // Add download buttons
            addDownloadButton("download-xml", "data.xml", xmlContent);
            addDownloadButton("download-yaml", "data.yaml", yamlContent);
            addDownloadButton("download-csv", "data.csv", csvContent);

            // Convert to ProtoBuf and MessagePack
            const protoBuf = jsonToProtoBuf(jsonData);
            const messagePack = jsonToMessagePack(jsonData);

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

function jsonToXml(json) {
    let xml = `<root>`;
    for (const key in json) {
        xml += `<${key}>${json[key]}</${key}>`;
    }
    xml += `</root>`;
    return xml;
}

function jsonToYaml(json) {
    return Object.entries(json)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
}

function jsonToCsv(json) {
    const keys = Object.keys(json);
    const values = Object.values(json);
    return `${keys.join(",")}\n${values.join(",")}`;
}

async function jsonToProtoBuf(json) {
    return await protobufConverter(json);
}

async function jsonToMessagePack(json) {
    return await messagepackConverter(json);
}
