var express = require('express');
var path = require('path');
var app = express();


app.use(express.static('./dist'));

app.get('/',function(req,res){
	res.status(200).json({message:"no page"});
});

app.listen(3003,function(){
	console.log('express server listening on port: ',this.address().port);
});