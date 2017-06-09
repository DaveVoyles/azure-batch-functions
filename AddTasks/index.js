var batch = require('azure-batch');

module.exports = function (context, req) {
    context.log('processing...');
    
    var accountName = process.env.batchAccountName;
    var accountKey = process.env.batchAccountKey;
    var accountUrl = process.env.batchAccountUrl;
    
    var credentials = new batch.SharedKeyCredentials(accountName,accountKey);
    var batch_client = new batch.ServiceClient(credentials,accountUrl);

    // Create a unique Azure Batch pool ID
    var jobid = "job" + req.body.jobid;
    
    context.log(`Adding tasks to ${jobid}...`);   

    var tasksToAdd = ["task1","task2","task3","task4"]
    
    var promises = [];
    tasksToAdd.forEach(function(val,index){           
        var taskName = val;
               
        var taskConfig = {
            id: taskName,
            displayName: 'process audio in ' + taskName,
            commandLine: 'docker run jsturtevant/pyprocessor ' + taskName
        };

        promises.push(batch_client.task.add(jobid, taskConfig).then(_ => {
            context.log(`task added ${taskName}`)
        }).catch(err => {
            context.log(`An error occurred processing ${taskName}.`);
            context.log(err);
        }));
    }); 

    Promise.all(promises.map(reflect)).then(function(results){
        context.log("completed all promises");

        var success = results.filter(x => x.status === "resolved");
        var rejected = results.filter(x => x.status === "rejected");

        success.forEach(function(val,index){    
            context.log(val);
        });

        rejected.forEach(function(val,index){    
            context.log(val);
        });

        context.done();
    });
};

//https://stackoverflow.com/a/31424853
function reflect(promise){
    return promise.then(function(v){ return {v:v, status: "resolved" }},
                        function(e){ return {e:e, status: "rejected" }});
}