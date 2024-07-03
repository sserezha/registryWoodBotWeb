const XLSX = require("xlsx");
const dotenv = require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const url = process.env.URL;
const cookieParser = require('cookie-parser');
const mongoClient = new MongoClient(url, {
	maxPoolSize: 100,
	minPoolSize: 10,
	maxIdleTimeMS: 30000,
	waitQueueTimeoutMS: 5000
});

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
        await collection.insertOne(dataToWrite);
    }catch(err) {
        console.log(err);
    } finally {
        await mongoClient.close();
    }
}

async function changeAccessUser(UID){
	try{
		let userID = parseInt(UID);
		await mongoClient.connect();
		const db = mongoClient.db("main");
		const collection = db.collection("users");
		const user = await collection.find({"id":userID}).toArray();
		const userState = user[0].state;
		if(userState !=6){
			await collection.updateOne({"id":userID},{$set:{state:6, beforeBan:userState}});
		} else {
			await collection.updateOne({"id":userID},{$set:{state:user[0].beforeBan}});
		}
	} catch(err){
		console.log(err);
	} finally{
		await mongoClient.close();
	}
}

async function changeAdminAccessUser(UID){
	try{
		let userID = parseInt(UID);
		await mongoClient.connect();
		const db = mongoClient.db("main");
		const collection = db.collection("users");
		const user = await collection.find({"id":userID}).toArray();
		const userState = user[0].adminFlag;
		if(userState && userState == 1){
			await collection.updateOne({"id":userID},{$set:{adminFlag:0}});
		} else {
			await collection.updateOne({"id":userID},{$set:{adminFlag:1}});
		}
	} catch(err){
		console.log(err);
	} finally{
		await mongoClient.close();
	}
}

function checkDate(arr, mounth, year){
    const result = [];
    arr.forEach((itemFirst) => {
        if (itemFirst.enteredData.date.includes(mounth) && itemFirst.enteredData.date.includes(year)){
            result.push(itemFirst);
            };
    });
    return result;
    }

async function getFromDB(date){
	try {
		let parts = date.split("-");
		let mounth = parts[1];
		let year = parts[0];
		await mongoClient.connect();
		const db = mongoClient.db("main");
		const collection = db.collection('registry');
		const findAll = await collection.find({}).toArray();
	    var excellFile = XLSX.readFile('registry_.xlsx', {cellDates:true, cellStyles: true});
		excellFile.Sheets.Лист1['!ref'] = 'A1:K200'
		let foundResult = checkDate(findAll, mounth, year);
        foundResult.forEach((item, index) => {
            let row = index + 2;
            let keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(letter => letter + row);
            let values = [
                { type: 'd', value: Date.parse(item.enteredData.date + 'T00:00:00.000Z'), format: 'dd/mm/yyyy' },
                { type: 's', value: item.enteredData.autoNo },
                { type: 's', value: item.enteredData.woodSpecies },
                { type: 's', value: item.enteredData.sortiment },
                { type: 's', value: item.enteredData.rideFrom },
                { type: 's', value: item.enteredData.rideTo },
                { type: 's', value: item.enteredData.ridesCount }
            ];
            
            keys.forEach((key, kIndex) => {
                let { type, value, format } = values[kIndex];
                excellFile.Sheets.Лист1[key] = format ? { t: type, v: value, z: format } : { t: type, v: value };
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

async function checkAuth(phone){
    await mongoClient.connect();
    const db = mongoClient.db("main");
    const users = db.collection("users");
    if (phone){
        const user = await users.find({"phone":phone}).toArray();
        console.log("checkAuth func user = "+JSON.stringify(user));
        if (user.length>0){
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

async function checkCode(code){
    try{
        await mongoClient.connect();
        const db = mongoClient.db("main");
        const users = db.collection("users");
        const user = await users.find({"code":parseInt(code)}).toArray();
        if (user.length>0){
            return user[0].phone;
        } else {
            return "not found";
        }
    } catch(err){
        console.log(err);
    }
};

module.exports = {
    initDB, getOptions, writeToDB, changeAccessUser, getFromDB, updateOptions, getUsers, changeAdminAccessUser, checkCode, checkAuth
};