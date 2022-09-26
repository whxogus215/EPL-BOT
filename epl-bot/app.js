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

  const score_obj = data["score"]["full_time"];
  const score_arr = Object.values(score_obj);

  const template = {
    "version": "2.0",
    "template": {
      "outputs": [
        {
            "simpleText" : {
              "text" : ""
            }
        },
        {
          "carousel": {
            "type" : "itemCard",
            "items" : [
              {
                "imageTitle": {
                  "title": data["team_1"].name + "vs" + data["team_2"].name,
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
                    "title": "경기 일시", // api에서 찾아봐야 됨
                    "description": ''
                  },
                  {
                    "title" : "경기 장소", // api에서 찾아봐야 됨
                    "description" : ''
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
            ]
          }
        }
      ]
    }
  }

  return template;
}

apiRouter.post('/sayHello', function(req, res) {
  
  // params에 해당하는 부분만 JSON 형태이므로 일반 객체로 변환
  const request = JSON.parse(req.body.action.params.round_num) // req.action ~ body를 빼먹어서 오류가 생겼음
  // 만약 params를 제외한 나머지는 일반 객체이다.

  // const responseBody = {
  //   version: "2.0",
  //   template: {
  //     outputs: [
  //       {
  //         simpleText: {
  //           text: "hello I'm Ryan"
  //         }
  //       }
  //     ]
  //   }
  // };
  // res.status(200).send(responseBody);

  // console.log(req.body.userRequest);
  console.log(request.amount);
  // console.log(req.body)
});

apiRouter.post('/sayTest', function(req,res) {
  const question = req.body.userRequest.utterance;

  const responseBody = {
  version: "2.0",
  template: {
    outputs: [
      {
        simpleText: {
          text: "맨체스터 시티"
          }
        }
      ]
    }
  };

  console.log(question);
  
  res.status(200).send(responseBody);
}
);

apiRouter.post('/result', (req,res)=>{

  const request = JSON.parse(req);
  const round_num = req["action"]["params"];

  const options = {
    method: 'GET',
    url: 'https://livescore-football.p.rapidapi.com/soccer/matches-by-league',
    qs: {
      country_code: 'england',
      league_code: 'premier-league',
      timezone_utc: '0',
      round: '8'
    },
    headers: {
      'X-RapidAPI-Key': process.env.API_KEY,
      'X-RapidAPI-Host': 'livescore-football.p.rapidapi.com',
      useQueryString: true
    }
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    const result = JSON.parse(body);
    // result.data.forEach( a => {
    //   console.log(a)
    // });
    console.log(result.data[1]);

    // 템플릿 반환하는 함수를 responseBody에 담고, 이를 res.send로 전달 / body 값을 파싱한 result (배열) -> 특정 라운드만 추출 -> 
  });


})



app.listen(PORT, function(){
	console.log('node on 3000');
});



