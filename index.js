const fs = require('fs');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();
const cookieParser = require('cookie-parser');
const mongoFunctions = require("./mongoFunctions")
app.use(bodyParser.json());
app.set('view engine','ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));
const MongoClient = require('mongodb').MongoClient;
const url = process.env.URL;
const mongoClient = new MongoClient(url, {
	maxPoolSize: 100,
	minPoolSize: 10,
	maxIdleTimeMS: 30000,
	waitQueueTimeoutMS: 5000
});
const autoNumbers=[197,737,327,281,947,221,814];
const PORT = process.env.PORT;
app.use(cookieParser());

const adminMiddleware = (req, res, next) => {
	if (req.cookies.username != "test"){next();}
	else {
const codeRequest = {requestcode:1}

fetch("http://localhost:3000/codeReq", {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
	},
	body: JSON.stringify(codeRequest),
})
.then(response => response.text())
.catch(error => console.error('Error:', error));
		res.render('auth')
	}
};

// ____________ ALL GET IN HERE ____________
app.get('/', (req, res) => {
	let failed = req.query.fail
	res.render('index', {autoNumbers, failed})		
});
app.get('/?fail', (req, res) => {
	let fail = req.query.fail;
	res.render('indexs', {autoNumbers});
	
});

app.get('/admin/', adminMiddleware, (req,res) =>{
	res.render('admin',{action: req.params.action});
});

app.get('/admin/:action', adminMiddleware, (req,res) =>{
	mongoFunctions.getUsers().then(users=>{
		mongoFunctions.getOptions(req.params.action).then (result=>{
			res.render('admin',{action: req.params.action, query: req.query, options: result[0], userList: users});
		});
	})
	});

app.get('/success', (req,res) =>{
	res.render('success');
});

// ____________ ALL POST IN HERE ____________
app.post('/updateOptions', (req, res) => {
	const value = req.body;
		mongoFunctions.updateOptions(value).then(res2 =>{
			res.json(value);
		});
		
	});

app.post('/updateUser', (req, res) => {
	try{
		const value = req.body;
		mongoFunctions.changeAccessUser(value.id).then(res2 =>{
			res.json(value);
		});
		
	}catch(err){
		console.log(err);
	}
	});


app.post('/submit', (req,res) =>{
	let enteredData = req.body;
	let database = 'registry';
	if (Object.keys(enteredData).length != 7){
		return res.redirect('/?fail=1');
	}
	
	else {
			mongoFunctions.writeToDB({enteredData}, database);
			return res.redirect('/success');
	}
});

app.post('/download', (req,res) =>{
	mongoFunctions.getFromDB(req.body.mounth).then(result=>{
		res.download(result);
		console.log(req.body);
	});

});
	// ____________ ALL OTHER IN HERE ____________
app.use((req, res, next) => {
	res.render('404');
})

app.listen(PORT, () => {
	mongoFunctions.initDB().then(res =>{
		console.log(res);
	});
	console.log('Server is running');
});