const XLSX = require("xlsx");
const dotenv = require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const url = process.env.URL;
const mongoClient = new MongoClient(url, {
	maxPoolSize: 100,
	minPoolSize: 10,
	maxIdleTimeMS: 30000,
	waitQueueTimeoutMS: 5000
});
async function migrateRegistry(){
    await mongoClient.connect();
    const db = mongoClient.db("main");
    const collection = db.collection("registry");
    const res = await collection.updateMany({},{$set:{rideType:"Полный рейс"}})
    return res;
}

async function initDB() {
    try {
      await mongoClient.connect();
      const db = mongoClient.db("main");
      const optionsCollectionExists = await db.listCollections({ name: 'options' }).hasNext();
      if (!optionsCollectionExists) {
        await db.createCollection("options");
        const options = db.collection("options");
        await options.insertMany([
          { optionName: "loadins", displayName: "Породы", savedValues: {} },
          { optionName: "loadouts", displayName: "Пункты вывоза", savedValues: {} },
          { optionName: "destinations", displayName: "Пункты выгрузки", savedValues: {} },
          { optionName: "sortiments", displayName: "Сортименты", savedValues: {} },
          { optionName: "download", displayName: "Скачать Excell", savedValues: {} },
          { optionName: "registry", displayName: "Реестр рейсов", savedValues: {} },
          { optionName: "users", displayName: "Пользователи", savedValues: {} }
        ]);
        console.log("Options collection created and initialized");
      }
      const repliesCollectionExists = await db.listCollections({ name: 'replies' }).hasNext();
      if (!repliesCollectionExists) {
        await db.createCollection("replies");
        const replies = db.collection("replies");
        await replies.insertMany([
          { nextButtons: "loadins", state: "dateRegistered", stateToChange: "loadinsRegistered", textForNextMessage: "Укажите породу дерева" },
          { nextButtons: "sortiments", state: "loadinsRegistered", stateToChange: "sortimentSet", textForNextMessage: "Укажите сортимент" },
          { nextButtons: "loadouts", state: "sortimentSet", stateToChange: "loadoutsSet", textForNextMessage: "Откуда везём" },
          { nextButtons: "destinations", state: "loadoutsSet", stateToChange: "rideType", textForNextMessage: "Куда везём" },
          { nextButtons: null, state: "endStage", stateToChange: null, textForNextMessage: "Укажите количество рейсов" }
        ]);
      }
  
      const resultOpt = optionsCollectionExists ? true : "fixed";
      const resultRep = repliesCollectionExists ? true : "fixed";
      
      return { resultOpt, resultRep };
    } catch (err) {
      console.error('An error occurred:', err);
    } finally {
      await mongoClient.close();
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
            let keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(letter => letter + row);
            let values = [
                { type: 's', value: item.rideType},
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

async function getRawRegistry(){
    await mongoClient.connect();
    const db = mongoClient.db("main");
    const collection = db.collection("registry");
    const res = await collection.find({}).toArray();
    return res;
}

async function deleteRegistryObject(_id){
    await mongoClient.connect();
    const db = mongoClient.db("main");
    const collection = db.collection("registry");
    const idToDelete = new ObjectId(_id);
    const result = await collection.deleteOne({_id:idToDelete});
    const found = await collection.find({}).toArray();
    console.log(found[0]._id);
    return result;
}

module.exports = {
    deleteRegistryObject, migrateRegistry,  initDB, getOptions, writeToDB, changeAccessUser, getFromDB, updateOptions, getUsers, changeAdminAccessUser, checkCode, checkAuth, getRawRegistry
};