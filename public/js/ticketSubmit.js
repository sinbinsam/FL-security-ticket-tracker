var calendar_from = new SalsaCalendar({
  inputId: 'date',
  lang: 'en',
  range: {
      min: 'today'
  },
  calendarPosition: 'right',
  fixed: false,
  connectCalendar: false
});

function validateEmail(mail) 
{
 if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail.value))
  {
    return (true)
  }
    alert("You have entered an invalid email address!")
    return (false)
}

let container = document.getElementById('time');

var picker = new NJTimePicker({
  targetID: 'time'
});

picker.on('save', function (data) {
  container.textContent = data.fullResult;
});

let submit = document.getElementById('submit')

submit.addEventListener('click', function() {
  let name      = document.getElementById('name'),
      date      = document.getElementById('date'),
      time      = document.getElementById('time'),
      details   = document.getElementById('details'),
      email     = document.getElementById('email');

      if (name.value.length <= 0 || time.value == 'undefined' || !time.value || time.value.length <= 0 || details.value.length <= 0) {
        console.log('not complete') //handle not complete form
      } else if (email.value == '') {
        submitForm(name, date, time, details, email)
      } else if (validateEmail(email) == true) {
        submitForm(name, date, time, details, email)
      }
})

async function submitForm(name, date, time, details, email) {
  axios.post('/ticket', {
    name: name.value,
    date: date.value,
    time: time.value,
    details: details.value,
    email: email.value,
    assigned: false,
    assignee: '',
    assignEmail: '',
    resolved: false,
    resolver: '',
    resolveTime: '',
    submitTime: ''
  })
  .then(function (response) {
    if (response.status == 200) {
      window.location.replace('/success')
    } else if (response.status == 500) {
      window.location.replace('/fail')
    }
  })
  .catch(function (error) {
    console.log(error);
  });
}