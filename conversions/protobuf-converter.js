import protobuf from 'protobufjs'
async function protobufConverter(json) {
    return new Promise((resolve, reject) => {
        protobuf.load(schema, (err, root) => {
            if (err) {
                reject("ProtoBuf schema loading error: " + err.message);
                return;
            }

            // Get the Data message type from the schema
            const Data = root.lookupType("Data");

            // Create a new message
            const message = Data.create(json); // Assume json is compatible with the schema
            const buffer = Data.encode(message).finish(); // Encode the message to a buffer

            resolve(buffer); // Return the buffer as ProtoBuf binary data
        });
    });
}
// Export the protobufConverter function
export { protobufConverter };
