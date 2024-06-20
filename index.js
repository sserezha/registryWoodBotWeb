	const XLSX = require("xlsx");
	const fs = require('fs');
	const express = require('express');
	const app = express();
	const bodyParser = require('body-parser');
	const dotenv = require('dotenv').config();
	const cookieParser = require('cookie-parser');
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
	async function getUsers(){
		try{
			await mongoClient.connect();
		const db = mongoClient.db("main");
		const users = db.collection("users");
		const allUsers = await users.find({}).toArray();
		return allUsers;
	}catch(err){
		console.log(err);
	} finally {
		await mongoClient.close();
	}
	}
	async function initDB(){
		try{
			await mongoClient.connect();
			const db = mongoClient.db("main");
			const options = db.collection("options");
			const replies = db.collection("replies");
			const checkOpt = await options.find({}).toArray();
			const checkRep = await replies.find({}).toArray();
			let resultOpt = false;
			let resultRep = false;
			if (checkOpt.length>0){
				resultOpt = true;
			} else {
				options.insertOne({optionName:"loadins",displayName:"Породы",savedValues:{}});
				options.insertOne({optionName:"loadouts",displayName:"Пункты вывоза",savedValues:{}});
				options.insertOne({optionName:"destinations",displayName:"Пункты выгрузки",savedValues:{}});
				options.insertOne({optionName:"sortiments",displayName:"Сортименты",savedValues:{}});
				// options.insertOne({optionName:"rideType",displayName:"Типы поездки",savedValues:{"0":'Выгрузка',"1":"Погрузка"}});
				resultOpt = "fixed";
			}
			if (checkRep.length>0){
				resultRep = true;
			} else {
				replies.insertOne({nextButtons:"loadins",state:"dateRegistered",stateToChange:"loadinsRegistered",textForNextMessage:"Укажите породу дерева"});
				replies.insertOne({nextButtons:"sortiments",state:"loadinsRegistered",stateToChange:"sortimentSet",textForNextMessage:"Укажите сортимент"});
				replies.insertOne({nextButtons:"loadouts",state:"sortimentSet",stateToChange:"loadoutsSet",textForNextMessage:"Откуда везём"});
				replies.insertOne({nextButtons:"destinations",state:"loadoutsSet",stateToChange:"rideType",textForNextMessage:"Куда везём"});
				replies.insertOne({nextButtons:"rideType",state:"rideType",stateToChange:"endStage",textForNextMessage:"Выберите тип поездки"});
				replies.insertOne({nextButtons:null,state:"endStage",stateToChange:null,textForNextMessage:"Укажите количество рейсов"});
				resultRep = "fixed";
			}
			return {resultOpt, resultRep};
		} catch(err) {
			console.log(err);
		}
		
	}

	async function getOptions(option){
		try{
			await mongoClient.connect();
			const db = mongoClient.db("main");
			const collection = db.collection("options");
			const gotOptions = await collection.find({optionName:option}).toArray();
			if (gotOptions.length){
				return gotOptions;
			}else {
				let errArray = [{"optionName":"err"}]; 
			return errArray;
			}
		}catch(err){
			let errArray = [{"optionName":"err"}]; 
			console.log(err);
			return errArray;
		}finally{
			await mongoClient.close();
		}}
	async function writeToDB(dataToWrite, dbname) {
		try {
			await mongoClient.connect();
			const db = mongoClient.db("main");
			const collection = db.collection(dbname);
			const result = await collection.insertOne(dataToWrite);
			console.log(result);
			console.log(dataToWrite);
		}catch(err) {
			console.log(err);
		} finally {
			await mongoClient.close();
		}
	}//test
	var mounths = new Map ([
		['Январь','-01-'],
		["Февраль",'-02-'],
		['Март','-03-'],
		['Апрель','-04-'],
		['Май','-05-'],
		['Июнь','-06-'],
		['Июль','-07-'],
		['Август','-08-'],
		['Сентябрь','-09-'],
		['Октябрь','-10-'],
		['Ноябрь','-11-'],
		['Декабрь','-12-'],
	]);
	let gotMounth = 'Февраль';
	console.log(mounths.get(gotMounth));
	//end of test

	const adminMiddleware = (req, res, next) => {
		if (req.cookies.username == "test"){next();}
		else {res.render('auth')}
	};
	
async function changeAccessUser(UID){
	try{
		let userID = parseInt(UID);
		await mongoClient.connect();
		const db = mongoClient.db("main");
		const collection = db.collection("users");
		const user = await collection.find({"id":userID}).toArray();
		const userState = user[0].state;
		if(userState !=6){
			const res = await collection.updateOne({"id":userID},{$set:{state:6, beforeBan:userState}});
			console.log(res)
		} else {
			const res = await collection.updateOne({"id":userID},{$set:{state:user[0].beforeBan}});
			console.log(res)
		}
		
		
	} catch(err){
		console.log(err);
	} finally{
		await mongoClient.close();
	}
}
	async function getFromDB(gotMounth,gotYear){
		try {
			let gotYear='2024';
			let mounth = mounths.get(gotMounth);
			await mongoClient.connect();
			const db = mongoClient.db("main");
			const collection = db.collection('registry');
			const findResult = await collection.find({}).toArray();
		var excellFile = XLSX.readFile('registry_.xlsx', {cellDates:true, cellStyles: true});
		console.log(excellFile);
			excellFile.Sheets.Лист1['!ref'] = 'A1:K200'
			function checkDate(){
				const result = [];
				findResult.forEach((itemFirst) => {
					if (itemFirst.enteredData.date.includes(mounth) && itemFirst.enteredData.date.includes(gotYear)){
						result.push(itemFirst);
						};
				});
				return result;
				}
			let foundResult = checkDate(findResult);
			foundResult.forEach((item,index) =>{
				let row = index+2;
				let keys = ['A'+row,'B'+row, 'C'+row, 'D'+row, 'E'+row, 'F'+row, 'G'+row, 'H'+row];
				keys.forEach((key,kIndex)=>{
					let type='';
					let val = '';
					switch(kIndex){
						case 0:
						val = Date.parse((item.enteredData.date+'T00:00:00.000Z'));
						type = 'd';
						break
						case 1:
						val = item.enteredData.autoNo;
						type = 's';
						break
						case 2:
						val = item.enteredData.woodSpecies;
						type = 's';
						break
						case 3:
						val = item.enteredData.sortiment;
						type = 's';
						break
						case 4:
						if (item.enteredData.rideType === 1) {
							val='Вывозка';
						} else {val='Погрузка';}
						type = 's';
						break
						case 5:
						val = item.enteredData.rideFrom;
						type = 's';
						break
						case 6:
						val = item.enteredData.rideTo;
						type = 's';
						break
						case 7:
						val = item.enteredData.ridesCount;
						type = 's';
						break

					}
					if (type ==='d') {
						excellFile.Sheets.Лист1[key] = {t:type, v:val, z:'dd/mm/yyyy'};
						} else
						{excellFile.Sheets.Лист1[key] = {t:type, v:val}}
				});
			});
			let today = new Date()
			today.toISOString().split('T')[0]
			let fileName='downloadRegistry'+today.toISOString().split('T')[0]+'.xlsx';
			XLSX.writeFile(excellFile, fileName, {cellDates:true, bookType:"xlsx"});
			return fileName;
			}catch(err) {
			console.log(err);
		} finally {

			await mongoClient.close();
		}
	}
	async function updateOptions(newOptions){
		try{
			console.log(newOptions.savedValues);
			const toAdd = newOptions.savedValues;
			await mongoClient.connect();
			const db = mongoClient.db("main");
			const collection = db.collection("options");
			const result = await collection.updateOne({displayName:newOptions.displayName},{$set:{savedValues: toAdd}});
			return result;
		} catch(err){
			console.log(err)
		} finally{
			await mongoClient.close();
		}
	}

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
		getUsers().then(users=>{
			getOptions(req.params.action).then (result=>{
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
			updateOptions(value).then(res2 =>{
				console.log("updated with "+ value["displayName"]);
				res.json(value);
			});
			
		});

		app.post('/updateUser', (req, res) => {
			try{
				const value = req.body;
				changeAccessUser(value.id).then(res2 =>{
					console.log("updated with "+ value.id);
					res.json(value);
				});
				
			}catch(err){
				console.log(err);
			}
			});


	app.post('/submit', (req,res) =>{
		console.log(req.body);
		let enteredData = req.body;
		let database = 'registry';
		console.log(enteredData);
		console.log('~~~~~~~~~~~');
		console.log(Object.keys(enteredData).length);
		console.log('~~~~~~~~~~~');
		if (Object.keys(enteredData).length != 8){
			console.log('not inserted with error');
			return res.redirect('/?fail=1');
		}
		
		else {
				writeToDB({enteredData}, database);
				console.log('inserted');
				return res.redirect('/success');
		}
	});

	app.post('/download', (req,res) =>{
		let toDownload = '';
		console.log(req.body.mounth);
		getFromDB(req.body.mounth).then(result=>{
		console.log(result);
		res.download(result);
	});

		});
	// ____________ ALL OTHER IN HERE ____________
	app.use((req, res, next) => {
	res.render('404');
	})

	app.listen(PORT, () => {
		initDB().then(res =>{
			console.log(res);
		});
		console.log('Server is running');
	})
