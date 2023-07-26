
### how to run 

install dependencies in each folder

`pnpm install`

#### then you can run rabbit mq in docker

`docker compose up`

#### then you can run application in each folder

`pnpm start`

#### then you can send request to first service 

POST http://localhost:3000/process
Content-Type: application/json

{
"id": 999,
"value": "content"
}


you will get response from another service 
Processed job: {"id":999,"value":"content"}

