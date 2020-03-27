const   express     =   require('express'),
        moment      =   require('axios'),
        bodyParser  =   require('body-parser'),
        axios       =   require('axios'),
        app         =   express(),
        mongo       =   require('mongodb').MongoClient,
        ObjectId    =   require('mongodb').ObjectID;
        creds       =   require('./creds.json'),
        client      =   require('twilio')(creds.accountSid, creds.authToken),
        port        =   process.env.PORT || 9090;

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(__dirname + '/public')); //stylesheets and js

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.get('/api/tickets', (req, res) => {
    mongo.connect(creds.mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }

      var   db              = client.db('Security'),
            collection      = db.collection('Tickets');

        collection.find({}).toArray((err, docs) => {
            res.json(docs)
        })
    });
});

app.post('/api/assignTicket', (req, res) => { //takes two parameters, id and assignee
    let assignee = req.body.assignee
    let id = new ObjectId(req.body.id);
    mongo.connect(creds.mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }

      var   db              = client.db('Security'),
            collection      = db.collection('Tickets');

        collection.updateMany({_id: id}, 
            {'$set': {
                assigned: true,
                assignee: assignee
            }}, 
            (err, result) => {
                if (err) {
                    res.status(500).end()
                } else if (result) {
                    res.status(200).end()
                }
        })
    });
});

app.post('/api/resolveTicket', (req, res) => { //takes two parameters, id and resolver
    let resolver = req.body.resolver
    let id = new ObjectId(req.body.id);
    mongo.connect(creds.mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }

      var   db              = client.db('Security'),
            collection      = db.collection('Tickets');

        collection.updateMany({_id: id}, 
            {'$set': {
                resolved: true,
                resolver: resolver
            }}, 
            (err, result) => {
                if (err) {
                    res.status(500).end()
                } else if (result) {
                    res.status(200).end()
                }
        })
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/ticketSubmit.html')
})

app.get('/success', (req, res) => {
    res.send('sucess')
})

app.get('/fail', (req, res) => {
    res.send('internal server failure')
})

app.post('/ticket', (req, res) => {
    let data = {
        name: req.body.name,
        date: req.body.date,
        time: req.body.time,
        details: req.body.details,
        email: req.body.email
    }
    
        insertTicket(data, function(status) {
            if (status == 'fucked') {
                res.status(500).end()
            } else if (status == 'good') {
                res.status(200).end()
            }
        })
        
    
})

function insertTicket(data, callback) {
    sendText(data.details);
    mongo.connect(creds.mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }

      var   db              = client.db('Security'),
            collection      = db.collection('Tickets');

        collection.insertOne(data, (err, result) => {
            if (err) {
                callback('fucked')
            } else {
                callback('good')
            }
        })
    });
}

function sendText(words, sendNumber) {
client.messages
    .create({
     body: words,
     from: creds.number,
     to: sendNumber
   })
  .then(message => console.log(message.sid));
}



app.listen(port, (err) => {
    if (err) {
        console.log('there was an error starting the server')
        console.log(err)
        } else {
            console.log('Server started! V2 At http://localhost:' + port);
        }
});