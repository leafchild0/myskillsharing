/**
 * Created by: leaf
 * Date: 7/19/15
 * Time: 6:54 PM
 */

var mongo = require('mongodb');
var monk = require('monk');
var monkdb =  monk('localhost:27017/ssdb');
var collection = monkdb.get("talks");

var db = module.exports = function() {};

db.prototype.add = function(data) {
    collection.insert(data, function(err, record) {
        if (err) throw err;
        console.log("Record added as " + record._id);
    });
};

db.prototype.update = function(title, data, callback) {
    collection.update({"title": title}, { $set: {"comments": data}},
        function(err) {
        if (err) throw err;
        callback(title);
    });
};

db.prototype.close = function() {
    monkdb.close();
};

db.prototype.remove = function(title, callback) {
    collection.remove({title : title});
    callback(title);
};

db.prototype.find = function(data) {
    //db
};

db.prototype.findAll = function(response, callback) {

    var talks = [];

    collection.find({}, function(err, records) {
        if (err) throw err;
        else records.forEach(function(record) {
            talks.push(record);

        });
        callback(talks, response);
    });
};