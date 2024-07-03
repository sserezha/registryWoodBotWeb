const express = require('express');
const router = express.Router();
const autoNumbers=[197,737,327,281,947,221,814];
const mongoFunctions = require("../mongoFunctions");

const adminMiddleware = async (req, res, next) => {
    const check = await mongoFunctions.checkAuth(req.cookies.auth);
	if (check){
        next();
    }
	else {
		res.render('auth');
	}
};

router.get('/', (req, res) => {
	let failed = req.query.fail
	res.render('index', {autoNumbers, failed})		
});
router.get('/?fail', (req, res) => {
	let fail = req.query.fail;
	res.render('indexs', {autoNumbers});
	
});

router.get('/admin/', adminMiddleware, (req,res) =>{
    console.log("checkauth="+mongoFunctions.checkAuth(req.cookies.auth))
	res.render('admin',{action: req.params.action});
});

router.get('/admin/:action', adminMiddleware, (req,res) =>{
	mongoFunctions.getUsers().then(users=>{
		mongoFunctions.getOptions(req.params.action).then (result=>{
			res.render('admin',{action: req.params.action, query: req.query, options: result[0], userList: users});
		});
	})
	});

    router.get('/success', (req,res) =>{
	res.render('success');
});

// ____________ ALL POST IN HERE ____________
router.post('/updateOptions', (req, res) => {
	const value = req.body;
		mongoFunctions.updateOptions(value).then(res2 =>{
			res.json(value);
		});
		
	});

router.post('/updateUser', (req, res) => {
try{
    const value = req.body;
    mongoFunctions.changeAccessUser(value.id).then(() =>{
        res.json(value);
    });
    
}catch(err){
    console.log(err);
    }
});

    router.post('/checkCode', async (req,res) => {
	const reqResult = await mongoFunctions.checkCode(req.body.code);
    console.log(reqResult)
	res.json(reqResult);
})

router.post('/updateUserAdmin', (req, res) => {
		try{
			const value = req.body;
			mongoFunctions.changeAdminAccessUser(value.id).then(() =>{
				res.json(value);
			});
			
		}catch(err){
			console.log(err);
		}
		});


router.post('/submit', (req,res) =>{
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

router.post('/download', (req,res) =>{
	mongoFunctions.getFromDB(req.body.mounth).then(result=>{
		res.download(result);
		console.log(req.body);
	});

});

module.exports = router;