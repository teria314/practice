express = require('express');
bodyParser = require('body-parser');
app = express();
app.set('view engine', 'jade');
app.set('views','./views');
app.use(bodyParser.urlencoded({ extended: false }));

let members = [];
let writings = [];
let loginid;
let loginnickname;
app.get('/',function(req,res){
    res.redirect('/login');
});

app.get('/login',function(req,res){
    res.render('login');
});

app.post('/loginhandling',function(req,res){
    if(req.body.logout){
        loginid = null;
        res.redirect('/login');
    }
    let rid = req.body.id;
    let rpw = req.body.pw;
    for(let member of members){
        if(rid === member.id && rpw === member.pw){
            loginid = rid;
            loginnickname = member.nickname;
            res.send('<script>alert("' + member.nickname + '님 안녕하세요"); location.href="/boardlist" </script>');
        }
    }
    res.send('<script>alert("존재하지 않는 아이디이거나 비번이 틀렸습니다"); location.href="/login" </script>');
});

app.get('/join',function(req,res){
    res.render('join');
});

app.post('/joinHandling', function(req,res){
    members.push(
    {
        id : req.body.id,
        pw : req.body.pw,
        nickname : req.body.nickname,
    })
    res.send('<script>alert("회원가입 정상처리되었습니다"); location.href="/login" </script>');
});

app.get('/boardlist',function(req,res){
    res.render('boardlist', {list: writings});
});

app.get('/board/:id',function(req,res){
    res.render('board', {writing : writings[req.params.id], id : req.params.id });
});

app.get('/add',function(req,res){
    res.render('add');
});

app.post('/addHandling',function(req,res){
    let curtime = new Date();

    writings.push(
        {
            title : req.body.title,
            content : req.body.content,
            writer_id : loginid,
            writer_nickname : loginnickname,
            time : curtime.getFullYear() + '/' +curtime.getMonth() + '/' + curtime.getDate() + ' ' + curtime.getHours() + ' : ' + curtime.getMinutes() ,
        });
    let wid = writings.length-1;
    res.send(`<script>alert("게시글 업로드 완료"); location.href="/board/${wid}" </script>`);
});

app.post('/edit', function(req,res){
    if(writings[req.body.id].writer_id != loginid){
        res.send(`<script>alert("타인의 게시글은 수정 불가능합니다"); location.href="/board/${req.body.id}" </script>`);
    }else{
        res.render('edit', {writing : writings[req.body.id], id : req.body.id });
    }
    
});

app.post('/editHandling',function(req,res){
    let index = req.body.id;
    writings[index].title = req.body.title;
    writings[index].content = req.body.content;
    
    res.send(`<script>alert("게시글 수정 완료"); location.href="/board/${index}" </script>`);
});

app.post('/deleteHandling', function(req,res){
    if(writings[req.body.id].writer_id != loginid){
        res.send(`<script>alert("타인의 게시글은 삭제 불가능합니다"); location.href="/board/${req.body.id}" </script>`);
    }else{
        writings.splice(req.body.id,1);
        res.send(`<script>alert("게시글 삭제 완료"); location.href="/boardlist" </script>`);
    }
});

app.listen(3000,function(){
    console.log('server connected port : ' + 3000);
});