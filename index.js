const fs = require('fs');
const indexRoute = require('./routes/routes.js');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();
const cookieParser = require('cookie-parser');
const mongoFunctions = require("./mongoFunctions");
const favicon = require('serve-favicon');

app.use(favicon('public/icons/favicon.png'));
app.use(bodyParser.json());
app.set('view engine','ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

const PORT = process.env.PORT;
app.use(cookieParser());
app.use('/',indexRoute);

app.use((req, res, next) => {
	res.render('404');
})

app.listen(PORT, () => {
	// mongoFunctions.migrateRegistry().then(res =>{
	// 	console.log(res);
	// })
	mongoFunctions.initDB().then(res =>{
		console.log(res);
	});
	console.log('Server is running');
});