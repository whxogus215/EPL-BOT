const express = require('express');
const app = express();
const logger = require('morgan');
const bodyParser = require('body-parser');
const request = require('request');
const PORT = 3000;
const apiRouter = express.Router();

require('dotenv').config();


app.use(logger('dev', {}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));

app.use('/api', apiRouter);

function templateCarousel(data){

  const score_obj = data["score"]["full_time"]; // data의 score에 해당하는 오브젝트를 담은 뒤
  const score_arr = Object.values(score_obj); // 담은 오브젝트의 value를 배열로 담는다.
  const roundNum = data["round"];

  const carousel = {

          // team1 : HOME, team2 : AWAY
          "imageTitle": {
            "title": data["team_1"].name + "(홈) vs " + data["team_2"].name + "(어웨이)",
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
              "title": "경기 일시", // data["time"].scheduled -> timezone 설정 
              "description": ''
            },
            // 썸네일 로고 추가, data["team_1"].logo
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

function tableCarousel(data){
  const carousel = {
    "title": `${data["rank"]}위 ${data["team_name"]}`,
    "description": `${data["games_played"]}경기 ${data["points"]}승점 ${data["won"]}승 ${data["draw"]}무 ${data["lost"]}패 ${data["goals_for"]}득점 ${data["goals_against"]}실점 ${data["goals_diff"]}득실차`,
  }

  return carousel;
}

apiRouter.post('/sayHello', function(req, res) {
  
  // params에 해당하는 부분만 JSON 형태이므로 일반 객체로 변환
  const request = JSON.parse(req.body.action.params.round_num) // req.action ~ body를 빼먹어서 오류가 생겼음
  // 만약 params를 제외한 나머지는 일반 객체이다.

  // console.log(req.body.userRequest);
  console.log(request.amount);
  // console.log(req.body)
});

apiRouter.post('/result', (req,res)=>{

  const result = JSON.parse(req.body.action.params.round_num); // 라운드 입력 값
  const round_num = result.amount;
  const simpleText = {
    "simpleText" : {
      "text" : `22-23 EPL ${round_num} 라운드 결과입니다.`
    }
  }; // 라운드 입력 값을 전달받아 simpleText(응답 시 첫 메세지)에 저장

  // API 요청 헤더, API 키 환경변수 관리하기
  const options = {
    method: 'GET',
    url: 'https://livescore-football.p.rapidapi.com/soccer/matches-by-league',
    qs: {
      country_code: 'england',
      league_code: 'premier-league',
      timezone_utc: '0',
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

    const tableTemplate = {
      "version": "2.0",
      "template": {
        "outputs": [
          {
            "carousel": {
              "type" : "listCard",
              "items" : [
                {
                  "header": {
                    "title" : "EPL 22-23 팀 순위"
                  },
                  "items": []
                }
              ]
            }
          }
        ]
      }
    }
    const itemArr = tableTemplate.template.outputs[0].carousel.items[0].items;
    // // items에 각각의 팀 결과를 오브젝트로 담아서 추가해야 함!

    const result = JSON.parse(body);
    const table_data = result.data.total;

    for (i = 0; i< 5; i++){
      itemArr.push(tableCarousel(table_data[i]));
    }

    // table_data.forEach(a => {
    //   itemArr.push(tableCarousel(a));
    //     // 배열의 오브젝트 값을 함수로 넘김
    // })
    // console.log(itemArr);
    // JSON.stringify(tableTemplate.template.outputs[0].carousel.items[0]);
    res.json(tableTemplate);
  });

})



app.listen(PORT, function(){
	console.log('node on 3000');
});



