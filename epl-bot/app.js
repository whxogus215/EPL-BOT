const express = require('express');
const app = express();
const logger = require('morgan');
const bodyParser = require('body-parser');
const request = require('request');
const PORT = 3000;
const apiRouter = express.Router();

let arrQuickReplies = []; // 바로연결 버튼에 들어갈 라운드 입력 값(최대 3개)


require('dotenv').config();


app.use(logger('dev', {}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));

app.use('/api', apiRouter);

// 함수만 따로 파일 만들어서 관리하기! (나중에)

function templateCarousel(data){

  const score_obj = data["score"]["full_time"]; // data의 score에 해당하는 오브젝트를 담은 뒤
  const score_arr = Object.values(score_obj); // 담은 오브젝트의 value를 배열로 담는다.

  // 날짜 문자열 정규식 변환
  const str_date = String(data["time"].scheduled).replace(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/, '$1/$2/$3/$4:$5:$6');

  const mil_date = Date.parse(str_date); // UTC 기준 밀리초 반환

  const kor_date = new Date(mil_date); // UTC 기준 밀리초 Date 객체 반환
  const date = kor_date.toGMTString(); // 날짜 문자열 포맷 출력

  const carousel = {

          // team1 : HOME, team2 : AWAY
          "imageTitle": {
            "title": data["team_1"].name + "(홈) vs " + data["team_2"].name + "(어웨이)",
            "imageUrl": data["team_1"].logo, // 홈 팀 로고
          },
          "itemList": [
            {
              "title": "경기 라운드",
              "description": data["round_info"],
            },
            {
              "title": "경기 스코어",
              "description": score_arr[0] + ":" + score_arr[1],
            },
            {
              "title": "경기 일시",
              "description": date,
            },
          ],
          "itemListAlignment": "left",
          "buttons": [
            {
              "label": "자세히",
              "action": "message",
              "messageText" : "경기 세부사항"
            }
          ]
        } 

  return carousel;
}

function tableClub(data){
  const rankNum = String(data["rank"]).padStart(2,'0');
  let result = `${rankNum} | "${data["team_name"]}" ${data["games_played"]}경기 ${data["won"]}승 ${data["draw"]}무 ${data["lost"]}패 -- ${data["points"]}P`+'\n';

  return result;
}

function newsCarousel(data){
  const carousel = {
    "title": data["caption"],
    "thumbnail": {
      "imageUrl": data["thumbnail_1"]
    },
    "buttons": [
      {
        "action":  "webLink",
        "label": "자세히",
        "webLinkUrl": data["url"],
      }
    ]
  }

  return carousel;
}

function addQuickReplies(roundNum){
  if (arrQuickReplies.length == 3){
    arrQuickReplies.pop();
    arrQuickReplies.unshift(roundNum);
  } else {
    arrQuickReplies.unshift(roundNum);
  }
}

function getRoundTemplate(){

  const quickReplies = [];

  arrQuickReplies.forEach(value => {
    quickReplies.push({
      'label': value,
      'action': 'message',
      'messageText' : value
    })
  })

  const data = {
    "version": "2.0",
    "template": {
        "outputs": [
            {
                "simpleText": {
                    "text": "EPL 라운드를 입력해 주세요!"
                }
            }
        ],
        "quickReplies": quickReplies
    }
  }

  return data;
}

apiRouter.post('/sayHello', function(req, res) {
  
  // params에 해당하는 부분만 JSON 형태이므로 일반 객체로 변환
  const request = JSON.parse(req.body.action.params.round_num) // req.action ~ body를 빼먹어서 오류가 생겼음
  // 만약 params를 제외한 나머지는 일반 객체이다.

  // console.log(req.body.userRequest);
  console.log(request.amount);
  // console.log(req.body)
});

apiRouter.post('/result-question', (req,res)=>{

  const data = getRoundTemplate();

  res.json(data);

})

apiRouter.post('/result', (req,res)=>{

  const result = JSON.parse(req.body.action.params.round_num); // 라운드 입력 값
  const round_num = result.amount;
  addQuickReplies(round_num); // 배열에 라운드 입력 값 추가

  const simpleText = {
    "simpleText" : {
      "text" : `22-23 EPL ${round_num} 라운드`
    }
  }; // 라운드 입력 값을 전달받아 simpleText(응답 시 첫 메세지)에 저장

  // API 요청 헤더, API 키 환경변수 관리하기
  const options = {
    method: 'GET',
    url: 'https://livescore-football.p.rapidapi.com/soccer/matches-by-league',
    qs: {
      country_code: 'england',
      league_code: 'premier-league',
      timezone_utc: '9:00',
      round: round_num,
    },
    headers: {
      'X-RapidAPI-Key': process.env.API_KEY,
      'X-RapidAPI-Host': 'livescore-football.p.rapidapi.com',
      useQueryString: true
    }
  };

  // Request API 요청 코드
  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    const dataTemplate = {
      "version": "2.0",
      "template": {
        "outputs": [
          simpleText,
          {
            "carousel": {
              "type" : "itemCard",
              "items" : []
            }
          }
        ]
      }
    }
    const itemArr = dataTemplate.template.outputs[1].carousel.items;

    const result = JSON.parse(body);
    result.data.forEach( a => {
      itemArr.push(templateCarousel(a));
    });
    res.json(dataTemplate);
  });
})

apiRouter.post('/team-table', (req, res)=>{

  // API 요청 헤더, API 키 환경변수 관리하기
  const options = {
    method: 'GET',
    url: 'https://livescore-football.p.rapidapi.com/soccer/league-table',
    qs: {country_code: 'england', league_code: 'premier-league'},
    headers: {
      'X-RapidAPI-Key': process.env.API_KEY,
      'X-RapidAPI-Host': 'livescore-football.p.rapidapi.com',
      useQueryString: true
    }
  };
  
  // Request API 요청 코드
  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    let teamStr = "";

    const result = JSON.parse(body);
    const table_data = result.data.total;
      
    for(i = 0; i< 20; i++){
      teamStr = teamStr + tableClub(table_data[i]);
    }
    
    const tableTemplate = {
      "version": "2.0",
      "template": {
        "outputs": [
          {
            "simpleText":{
              "text" : `실시간 22-23 EPL 순위입니다.`,
            }
          },
          {
            "simpleText":{
              "text" : teamStr,
            }
          }
        ]
      }
    }

    res.json(tableTemplate);
  });
})


apiRouter.post('/club-news', (req, res)=>{

  // API 요청 헤더, API 키 환경변수 관리하기
  const options = {
    method: 'GET',
    url: 'https://livescore-football.p.rapidapi.com/soccer/news-list',
    qs: {page: '1'},
    headers: {
      'X-RapidAPI-Key': process.env.API_KEY,
      'X-RapidAPI-Host': 'livescore-football.p.rapidapi.com',
      useQueryString: true
    }
  };
  
  // Request API 요청 코드
  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    const newsTemplate = {
      "version": "2.0",
      "template": {
        "outputs": [
          {
            "carousel": {
              "type" : "basicCard",
              "items" : []
            }
          }
        ]
      }
    }
    const itemArr = newsTemplate.template.outputs[0].carousel.items;

    const result = JSON.parse(body);
    const news_data = result.data;

    for (i = 0; i< 10; i++){
      itemArr.push(newsCarousel(news_data[i]));
    }

    res.json(newsTemplate);
  });
})

app.listen(PORT, function(){
	console.log('node on 3000');
});



