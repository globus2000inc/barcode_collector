const srvHost = 'http://10.1.0.113:8080/';

var express = require('express');
var mysql = require('mysql');
var qr = require('qr-image');


var server = express();
var dbClient = mysql.createConnection({
    host: '127.0.0.1',
    port: '3306',
    database: 'barcode_register',
    user: 'barcode_reg_user',
    password: 'VOu2D8uadVXiNOia'
});


var bodyParser = require('body-parser');

server.use(bodyParser.json());
server.use(bodyParser.urlencoded({ extended: true }));

server.get('/qr', function(req, res) {
    var code = qr.image(new Date().toString(), { type: 'png' });
    res.type('png');
    code.pipe(res);
});

server.get('/users', function(req, res) {
   dbClient.query('SELECT * FROM store_keys', function (error, result) {
       console.log(result);
       if (!error) {
           res.json(result);
       }
   });
});

server.get('/', function (req, res) {
    res.send('Hello API');
});

server.get('/barcodes/:masterkey', function (req, res) {
    //console.log(req.params);
    dbClient.query('SELECT * FROM store_keys WHERE user_key="' + req.params.masterkey +'" AND key_type=10 LIMIT 1', function (error, result) {
        console.log(result);
        if (!error) {
            if (result.length > 0) {
                dbClient.query('SELECT * FROM collected_barcodes', function (error, result) {
                    if (error) {
                        console.log(errors);
                    }
                    res.send(result);
                });
            }
            else {
                console.log ('Not registered access-key');
                res.sendStatus(404);
            }
        }
    });
});

server.delete('/barcodes/delete/:masterkey', function (req, res) {
    //console.log(req.params);
    dbClient.query('SELECT * FROM store_keys WHERE user_key="' + req.params.masterkey +'" AND key_type=10 LIMIT 1', function (error, result) {
        console.log(result);
        if (!error) {
            if (result.length > 0) {
                let barcodes_delete = req.body;
                  barcodes_delete.forEach(function (item) {
                      dbClient.query('DELETE FROM collected_barcodes WHERE barcode_id='+item.barcode_id+' AND barcode='+item.barcode, function (error, result) {
                          if (error) {
                              console.log(errors);
                          }
                      });
                  });
                res.sendStatus(200);
            }
            else {
                console.log ('Not registered access-key');
                res.sendStatus(404);
            }
        }
    });
});

server.get('/new/upload', function (req, res) {
    console.log(req.headers['access-key']);
    let accessKey = req.headers['access-key'];

    dbClient.query('SELECT * FROM store_keys WHERE user_key="' + accessKey +'" LIMIT 1', function (error, result) {
        console.log(result);
        if (!error) {
            if (result.length > 0) {
                var link = srvHost + 'upload/' + accessKey;
                var code = qr.image(link, { type: 'png' });
                res.type('png');
                code.pipe(res);
                res.set({
                    'Token': accessKey,
                    'Content-Type':  'image/png'
                })
            }
            else {
                console.log ('Not registered access-key');
            }
        }
    });

});
server.post('/*/upload/', function (req, res) {
    let accessKey = require('path').parse(req.path).dir.slice(1);

    dbClient.query('SELECT * FROM store_keys WHERE user_key="' + accessKey +'" LIMIT 1', function (error, result) {
        console.log(result);
        if (!error) {
            let user = result[0].givenName + ' ' + result[0].sn;
            if (result.length > 0) {
                let barcodes = req.body;
                barcodes.forEach(function (barcode_item) {
                    console.log(barcode_item);
                    dbClient.query('INSERT IGNORE INTO collected_barcodes (barcode_id,barcode,user_key) VALUES (NULL,'+barcode_item.barcode+',"'+accessKey+'")', function (error, result) {
                        if (error) {
                            console.log(errors);
                        }
                        console.log('Collected data insert into database by user: ' + user);
                    });
                });
                res.sendStatus(200);
            }
            else {
                console.log ('Not registered access-key');
                res.sendStatus(503);
            }
        }
    });
});


dbClient.connect(function (err, connection) {
   if (err) {
       res.json({'code':100, 'status':'Error in connection database'});
       return console.log(err);
   }

    server.listen(8080, function () {
        console.log('Barcode RestAPI started')
    });
});
