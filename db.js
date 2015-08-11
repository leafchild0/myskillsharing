/**
 * Created by: leaf
 * Date: 7/19/15
 * Time: 6:54 PM
 */

var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/ssdb';

var db = module.exports = function() {
    this.dBase = {};
};

MongoClient.connect(url, function(err, db) {
    if (err) console.log("Something wrong with DB connection");
    else {
        console.log("Connected correctly to DB");
        this.dBase = db;
        dBase.collection = db.collection('talks');
    }



});

db.prototype.closeCon = function() {
    dBase.close();
};

db.prototype.add = function(data) {
    dBase.collection.insert(data, function(err, records) {
        if (err) throw err;
        console.log("Record added as " + records.ops[0]._id);
    });
};

db.prototype.update = function(data) {
    //db
};

db.prototype.remove = function(data) {
    //db
};

db.prototype.find = function(data) {
    //db
};

db.prototype.findAll = function() {
    dBase.collection.find(data, function(err, records) {
        if (err) throw err;
        return records;
    });
    return "";
};