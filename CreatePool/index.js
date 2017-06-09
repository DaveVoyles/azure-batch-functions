var batch = require('azure-batch');

module.exports = function (context, req) {
    context.log('processing...');
    
    var accountName = process.env.batchAccountName;
    var accountKey = process.env.batchAccountKey;
    var accountUrl = process.env.batchAccountUrl;
    
    var credentials = new batch.SharedKeyCredentials(accountName,accountKey);
    var batch_client = new batch.ServiceClient(credentials,accountUrl);

    // Create a unique Azure Batch pool ID
    var poolid = "pool" + req.params.poolid;
    
    context.log(`Creating new pool ${poolid}...`);    
    batch_client.account.listNodeAgentSkus().then((agentNodes) => {
        context.log(agentNodes);

        var agentNode = agentNodes.filter(x => x.id === 'batch.node.ubuntu 16.04')[0];
        var verifiedImage = agentNode.verifiedImageReferences[0];
        
        // Creating Image reference configuration for Ubuntu Linux VM
        var vmconfig = {imageReference:verifiedImage,
                        nodeAgentSKUId:"batch.node.ubuntu 16.04"};
        var vmSize = "STANDARD_A1";
        var numVMs = 4;

        var poolConfig = {
            id: poolid,
            displayName: poolid,
            vmSize: vmSize,
            virtualMachineConfiguration: vmconfig,
            targetDedicated: numVMs,
            targetLowPriorityNodes: numVMs,
            startTask: {
                commandLine: "./docker_starttask.sh > startup.log",
                resourceFiles: [{
                    'blobSource': process.env.blobsasurl,
                    'filePath': 'docker_starttask.sh'
                }],
                userIdentity: {
                    autouser: {
                        elevationLevel: 'admin'
                    }
                },
                waitForSuccess: true
            },
            enableAutoScale: false
        };

        batch_client.pool.exists(poolid).then(exists => {
            if (exists){
                context.log("already exists");
                context.done();
            }

            batch_client.pool.add(poolConfig).then(() =>{
                context.log('pool added.')
                context.done();    
            });
        });
    }).catch((err) => {
        context.log('An error occurred.');
        context.log(err);
        context.done();
    });
};