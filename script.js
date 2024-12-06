document.getElementById("file-input").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
        const content = await file.text();
        document.getElementById("file-content").textContent = content;

        // Parse JSON
        const jsonData = JSON.parse(content);

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
    }
});

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
