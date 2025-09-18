// const { count } = require('console');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

console.log('server running!');

//値の初期値
let workTime = 0;           //作業時間
let breakTime = 0;          //休憩時間
let totalRepetition = 0;    //繰り返し回数
let countRepetition = 0;    //現在の繰り返し回数
let remainingTime = 0;      //残り時間
let timerInterval;          //タイマーのインターバルID
let situation = '準備'; //タイマーの状態 ('ワーク', '休憩', '準備')

//クライアントからの接続を待ち受ける
wss.on('connection', (ws) => {
    console.log('Client connected');

    const startTimer = () => {
        if (timerInterval) clearInterval(timerInterval); //既存のタイマーをクリア
        
        timerInterval = setInterval(() => {
          //残り時間が0になったら状態を切り替え
          if (remainingTime <= 0) { 
                if(situation === 'ワーク') {
                    situation = '休憩';
                    remainingTime = breakTime;
                    if(remainingTime === 0) {
                        //休憩時間が0の場合、次のワークに進む
                        situation = 'ワーク';
                        remainingTime = workTime;
                    }
                    countRepetition++;
                    //全ての繰り返しが終了したらタイマーを停止
                    if(countRepetition >= totalRepetition) {
                        situation = '準備';
                        clearInterval(timerInterval);
                        wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'timer_end' }));
                        }
                        });
                    return;
                    }
                }else if(situation === '休憩') {
                situation = 'ワーク';
                remainingTime = workTime;
                countRepetition++;
                //全ての繰り返しが終了したらタイマーを停止
                if(countRepetition >= totalRepetition) {
                        situation = '準備';
                        clearInterval(timerInterval);
                        wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'timer_end' }));
                        }
                        });
                    return;
                }
                }
                //1秒引く
                remainingTime--;
           }
            

            //残り時間の更新を送信
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({
                         type: 'update', 
                         time: remainingTime, 
                         situation: situation, 
                         count: countRepetition+1
                 }));
                }
            });
        },1000);
    };

    //タイマースタート
    app.post('/start', (req, res) => {
        const { workMinutes, workSeconds, breakMinutes, breakSeconds, repetitions } = req.body;

        //時間を秒に変換
        workTime = parseInt(workMinutes * 60 + workSeconds);
        breakTime = parseInt(breakMinutes * 60 + breakSeconds);
        totalRepetition = parseInt(repetitions);
        countRepetition = 0;
        remainingTime = 0;
        situation = '準備';

        //タイマーを開始
        situation = 'ワーク';
        remainingTime = workTime;
        
        startTimer();

        res.status(200).send({ message: 'started' });
    });

    //タイマー停止
    app.post('/stop', (req, res) => {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        res.status(200).send({ message: 'stopped' });
    });

    //タイマーリセット
    app.post('/reset', (req, res) => {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        remainingTime = 0;
        situation = '準備';
        countRepetition = 0;
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'reset' }));
            }
        });
        res.status(200).send({ message: 'reset' });
    });
});

//サーバーを指定ポートで起動
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});