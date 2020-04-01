const   express     =   require('express'),
        moment      =   require('moment'),
        bodyParser  =   require('body-parser'),
        axios       =   require('axios'),
        app         =   express(),
        mongo       =   require('mongodb').MongoClient,
        ObjectId    =   require('mongodb').ObjectID;
        creds       =   require('./creds.json'),
        client      =   require('twilio')(creds.accountSid, creds.authToken),
        sgMail      =   require('@sendgrid/mail'),
        port        =   process.env.PORT || 9090;


moment.suppressDeprecationWarnings = true;
sgMail.setApiKey(creds.sendGridApi);

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(__dirname + '/public')); //stylesheets and js
app.use(express.static('/public/dist'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/ticketSubmit.html')
})

app.get('/manage/tickets', (req, res) => {
    res.sendFile(__dirname + '/views/dist/index.html')
})

app.get('/success', (req, res) => {
    res.sendFile(__dirname + '/views/success.html')
})

app.get('/fail', (req, res) => {
    res.send('internal server failure')
})

app.post('/ticket', (req, res) => {
    let data = req.body
    
        insertTicket(data, function(status) {
            if (status == 'fucked') {
                res.status(500).end()
            } else if (status == 'good') {
                res.status(200).end()
            }
        })
        
    
})


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

app.get('/api/tickets/:type', (req, res) => {
let resolve = {resolved: false}
    if (req.params.type == 'resolved') {
        resolve.resolved = true
    }

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

        collection.find(resolve).sort({ $natural: -1 }).limit(200).toArray((err, docs) => { //Limit is X number of most recent tickets it will send to client
            res.json(docs)
        })
    });
});

app.post('/api/assignTicket', (req, res) => { //takes two parameters, id and assignee
    let assigneeObj = req.body.assignee
    let assignee = req.body.assignee.name
    let id = new ObjectId(req.body.ticketId);
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

      collection.findOne({_id: id}, (err, result) => {
          if (err) {
              console.log('there was an error finding the ticket')
          } else if (!err) {

            if (assigneeObj.name !== result.assignee && assigneeObj.email !== result.assignEmail) {
            const lineBreak = '\n'
            let msg = 'Requester: ' + result.name + lineBreak 
            + 'date: ' + result.date + ', ' + result.time + lineBreak
            + 'details: ' + result.details;
            let subject = 'New escort ticket assigned to you, ID: ' + JSON.stringify(result._id).slice(21,24);
                sendMail(assigneeObj.email, msg, subject)
            if (result.email !== '' && result.assigned == false) {
            let msg = 'Security escort ticket: ' + lineBreak 
            + 'date: ' + result.date + ', ' + result.time + lineBreak
            + 'details: ' + result.details + lineBreak
            + 'Your security escort will be handled by ' + assignee;
            let subject = assignee + ' will be your security escort for ticket ID: ' + JSON.stringify(result._id).slice(21,24);
                sendMail(result.email, msg, subject)
            } else if (result.email !== '' && result.assigned == true) {

                    let msg = 'Security escort ticket update:' + lineBreak 
                        + 'date: ' + result.date + ', ' + result.time + lineBreak
                        + 'details: ' + result.details + lineBreak
                        + 'has been re-assigned to ' + assignee;
                            let subject = 'Your security escort ticket ID: ' + JSON.stringify(result._id).slice(21,24); + 'has been re-assigned';
                                sendMail(result.email, msg, subject)

                    let msg2 = 'Security escort ticket update:' + lineBreak 
                        + 'date: ' + result.date + ', ' + result.time + lineBreak
                        + 'details: ' + result.details + lineBreak
                        + 'has been re-assigned to ' + assignee + lineBreak 
                        + 'You are no longer responsible for this ticket';
                            let subject2 = 'Your ticket ID: ' + JSON.stringify(result._id).slice(21,24); + 'has been re-assigned';
                                sendMail(result.assignEmail, msg2, subject2)                    
                



            }
          }
        }
      })

        collection.updateMany({_id: id}, 
            {'$set': {
                assigned: true,
                assignee: assignee,
                assignEmail: assigneeObj.email
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
                resolveTime: moment().format('M/D/YY h:m a')
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

app.get('/api/escorts', (req, res) => {
    mongo.connect(creds.mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }, (err, client) => {
      if (err) {
        console.error(err)
        return
      }

      var   db              = client.db('Security'),
            collection      = db.collection('Conf');
      collection.find({}).toArray((err, docs) => {
          if (!docs || err) {
              console.log(err)
              collection.insert({'_id': 'escorts'}, (err, result) => {
                if (err) {
                    res.status(500).end()
                } else {
                    res.json(result)
                }
              })
          } else {
              res.json(docs)
          }

      })
    });
});



function insertTicket(data, callback) {
    checkForSameDay(data)
    //sendText(data.details);
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


            data.submitTime = moment().format('M/D/YY h:m a')
        collection.insertOne(data, (err, result) => {
            if (err) {
                callback('fucked')
            } else {
                callback('good')
            }
        })
    });
}

function checkForSameDay (data) {
    let bool = moment(data.date, 'MM-DD-YYYY').isSame(moment().format('MM-DD-YYYY'))
    if (bool == true) {
        let lineBreak = '\n'
        let message = 'New ticket submitted by ' + data.name.slice(0,20) + lineBreak 
        + 'When: ' + data.time + lineBreak
        + 'Details: ' + data.details.slice(0, 80)

        sendText(message)
    }
}

function sendText(words) {
client.messages
    .create({
     body: words,
     from: creds.number,
     to: creds.sendNumber
   })
  .catch(err => console.log(err));
}

function sendMail(email, textMsg, subject) {
    const msg = {
        to: email,
        from: 'ticket@sinbins.am',
        subject: subject,
        text: textMsg
      };
      sgMail.send(msg);
}



app.listen(port, (err) => {
    if (err) {
        console.log('there was an error starting the server')
        console.log(err)
        } else {
            console.log('Server started! V2 At http://localhost:' + port);
        }
});