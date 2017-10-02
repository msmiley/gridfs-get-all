#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const cliArgs = require('command-line-args');
const cliUsage = require('command-line-usage');
const mongo = require('mongodb');
const Grid = require('gridfs-stream');

//
// Enumerate CLI arguments
//
let args = [
  {
    name: "host",
    type: String,
    alias: "h",
    description: "mongodb host to connect to",
    defaultValue: "127.0.0.1"
  }, {
    name: "db",
    type: String,
    alias: "d",
    description: "database to use (default is 'test')",
    defaultValue: "test"
  }, {
    name: "prefix",
    type: String,
    description: "GridFS prefix to use (default is 'fs')",
    defaultValue: "fs"
  }, {
    name: "port",
    type: Number,
    description: "server port",
    defaultValue: 27017
  }, {
    name: "output",
    type: String,
    alias: "o",
    description: "Directory for output files (default is cwd)",
    defaultValue: "."
  }, {
    name: "help",
    type: Boolean,
    description: "Print usage information"
  }
];


// let command-line-args module parse the command line
const opts = cliArgs(args);

var fullhost = `mongodb://${opts.host}:${opts.port}/${opts.db}`;
var remaining = -1;
var connected = function(db) {
  console.log(`connected to mongodb at ${opts.host}`);
  
  var gfs = Grid(db, mongo);
  
  var files = db.collection(`${opts.prefix}.files`);
  files.count((err, cnt) => {
    err && console.error(err);
    console.log(`found ${cnt} files`);
    remaining = cnt;
    
    files.find().forEach((d) => {
      console.log(`file: ${d.filename}`);
      
      var rs = gfs.createReadStream({
        root: opts.prefix,
        _id: d._id
      });
      
      var ws = fs.createWriteStream(path.join(opts.output, d.filename));
      
      rs.on('close', () => {
        remaining--;
        ws.close();
      });
      
      rs.pipe(ws);
    }, (err) => {
      err && console.error(err);
    });
  });
  
  var doneCheck = setInterval(() => {
    if (remaining === 0) {
      db.close();
      clearInterval(doneCheck);
      console.log("done.");
    }
  }, 1000);
};



// initiate connect
mongo.MongoClient.connect(fullhost)
.then(db => connected(db)).catch(err => console.error(err));
