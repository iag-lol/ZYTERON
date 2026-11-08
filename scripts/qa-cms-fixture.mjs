import http from 'node:http';
http.createServer((req,res)=>{
  if(req.method!=='GET' && req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  res.writeHead(200,{'content-type':'application/json','content-range':'*/0'});
  res.end(req.headers.accept?.includes('vnd.pgrst.object')?'null':'[]');
}).listen(3199,'127.0.0.1');
