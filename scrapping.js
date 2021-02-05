const axios = require('axios')
const jsdom = require('jsdom')
const fs = require('fs')
const { JSDOM } = jsdom
const schedule = require('node-schedule')

const scrape = async () => {
    const html = await axios.get('https://www.elysee.fr/agenda')
    const dom = new JSDOM(html.data)

    let event = dom.window.document.querySelectorAll('.list-table')
    const arrEvent = [...event]

    let date = dom.window.document.querySelectorAll('.sticker__content')
    const arrDate = [...date]

    const tab1 = formatArray(arrEvent)
    const tab2 = formatArray(arrDate)

    let formatedArray = []

    for (let i = 0; i < arrDate.length; i++) {
        formatedArray[i] = {
            date: tab2[i],
            content: tab1[i]
        }
    }
    return formatedArray
}

///////////////////////// DATA FORMAT ////////////////////
const formatArray = array => array.map(e => e.textContent.replace(/\s+/g, ' '))

const regexp = new RegExp(/(?:[01]\d|2[0123]):(?:[012345]\d)/gm)
const regexpMoment = new RegExp(/(?:Matin|Après-midi)/)

const isFindTime = str => regexp.test(str)

const getTimeOnMatch = str => str.match(regexp)


const replaceMomentWithTimeCode = str => {
    let text = str.replace("Après-midi", "14:00")
    return text
}

const splitStrOnMatch = str => {
    let text = str.split(regexp)
    const filteredText = text.filter(e => e.length > 1)
    return filteredText
}


const reducedTimedArray = obj => {
    try {
        const timecodedObj = replaceMomentWithTimeCode(obj.content)
        const timeArray = getTimeOnMatch(timecodedObj)
        const contentArray = splitStrOnMatch(timecodedObj)
        let array = []
        for (let i = 0; i < timeArray.length; i++ ) {
                array[i] = { time: timeArray[i], event: contentArray[i] }

        }
        return array
    } catch (err) {
        console.log(err)
    }
}



const reducedUntimedArray = obj => {
    let array = []
    switch(obj.content.trim().split(' ')[0]){
        case 'Matin':
            array[0] = { time:'09:00', event:obj.content.trim().split(' ').slice(2).join(' ') }
            break
        case 'Après-midi':
            array[0] = { time:'14:00', event:obj.content.trim().split(' ').slice(2).join(' ') }
            break
        case 'Toute':
            array[0] = { time:'09:00', event:obj.content.trim().split(' ').slice(3).join(' ') }
            break            
    }
    return array
}

const organizedAgendaWithTimeCode = (obj) => {
  let newAgenda = obj;
  newAgenda.content = reducedTimedArray(obj);
  return newAgenda;
}


const organizedAgendaWithoutTimeCode = obj => {
    let newAgenda = obj
    newAgenda.content = reducedUntimedArray(obj)
    return newAgenda
}

const organizedAgenda = arr => {
    let unorganizedAgenda = arr
    
    for (let i = 0; i < unorganizedAgenda.length; i++){
        if(isFindTime(unorganizedAgenda[i].content)) {
            unorganizedAgenda[i] = organizedAgendaWithTimeCode(arr[i])
        } else {
            unorganizedAgenda[i] = organizedAgendaWithoutTimeCode(arr[i])
        }
    }
    
    return unorganizedAgenda
}

//////////////////// DATE FORMAT ///////////////////////
const _YEAR = new Date().getFullYear()

const splitedString = str => str.trim().split(' ')

const formatMonthToNumber = (str) => {
    switch(str) {
        case 'Janvier':
            return '01'
            break
        case 'Février':
            return '02'
            break
        case 'Mars':
            return '03'
            break
        case 'Avril':
            return '04'
            break
        case 'Mai':
            return '05'
            break
        case 'Juin':
            return '06'
            break
        case 'Juillet':
            return '07'
            break
        case 'Août':
            return '08'
            break
        case 'Septembre':
            return '09'
            break
        case 'Octobre':
            return '10'
            break
        case 'Novembre':
            return '11'
            break
        case 'Décembre':
            return '12'
            break
    }
}

const formatStringToDate = arr => {
    arr.shift()
    return `${_YEAR}-${formatMonthToNumber(arr[1])}-${arr[0]}`
}

const timestampedDate = obj => {
    let untimestampedDate = obj
    untimestampedDate.date = formatStringToDate(splitedString(obj.date))
    return untimestampedDate
}

const formatStringToHour = str => {
    return str.replace(':', '-')
}

const timeStampedHour = obj => {
        let untimestampedHour = obj
        for (let i = 0; i< untimestampedHour.content.length; i++) {
            if(untimestampedHour.content[i].time) {
                untimestampedHour.content[i].time = formatStringToHour(obj.content[i].time)
            }
        }
        return untimestampedHour
}

const timestampAgenda = arr => {
    let untimestampedAgenda = arr
    for (let i = 0; i < untimestampedAgenda.length; i++) {
        timestampedDate(untimestampedAgenda[i])
        timeStampedHour(untimestampedAgenda[i])
    }
    return untimestampedAgenda
}

const finalAgendaFormat = arr => {
    let formatedAgenda = []
    let content = []
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr[i].content.length; j++) {
            formatedAgenda.push({time: `${arr[i].date}-${arr[i].content[j].time}`, content:arr[i].content[j].event})
        }
    }
    return formatedAgenda
}





const monthAgenda = () => {
    scrape().then(res => {
        const agenda = finalAgendaFormat(timestampAgenda(organizedAgenda(res)))
        fs.writeFileSync('./month_agenda.json', JSON.stringify(agenda), 'utf-8')
         
     })
}


const dayAgenda = () => {
    // est-ce currentDay va se reset à chaque fois que la fonction dayAgenda sera appelée?
    let currentDay = new Intl.DateTimeFormat("fr-CA", {year: "numeric", month: "2-digit", day: "2-digit"}).format(Date.now())
    scrape().then(res => {
        const agenda = finalAgendaFormat(timestampAgenda(organizedAgenda(res)))
        let dayAgenda = []
        for (let i = 0; i < agenda.length; i++) {
            if (agenda[i].time.includes(currentDay)) {
                dayAgenda.push(agenda[i])
            }
        }
        fs.writeFileSync('./day_agenda.json', JSON.stringify(dayAgenda), 'utf-8')
    }) 
}

const currentAgenda = () => {
    const currentDay = new Intl.DateTimeFormat("fr-CA", {year: "numeric", month: "2-digit", day: "2-digit"}).format(Date.now())
    const currentTime = new Date()
    const currentMoment = `${currentDay}-${currentTime.getHours()}-${currentTime.getMinutes()}`
    const currentHour = currentTime.getHours()

    console.log(currentHour)
    scrape().then(res => {
        const agenda = finalAgendaFormat(timestampAgenda(organizedAgenda(res)))
        agenda.push({time:'2021-02-04-17-37', content:'SALUT JIOULES'})
        let currentAgenda = []
        for (let i = 0; i < agenda.length; i++) {
            if (agenda[i].time.includes(currentMoment)) {
                currentAgenda.push(agenda[i])
            }
        }
        if (currentHour >= 22) {
            currentAgenda.push({event:'nothing'})
        }
        fs.writeFileSync('./current_event.json', JSON.stringify(currentAgenda), 'utf-8')
    })
}

/* TODO: 
    currentEvent
*/

 const synchronize = () => {
     // - Job every minute
     schedule.scheduleJob('*/1 * * * *', () => {
        monthAgenda()
        dayAgenda()
        currentAgenda()
     })

 }

module.exports = synchronize

