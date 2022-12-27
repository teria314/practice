express = require('express');
session = require('express-session');
bodyParser = require('body-parser');
cookieParser = require('cookie-parser');
FileStore = require('session-file-store')(session);
hashmap = require('hashmap');
app = express();
app.set('view engine', 'jade');
app.set('views','./views');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    store:new FileStore(),
    name: 'connect.sid',
}));

function islogined(req){
    return req.cookies.loginid && (!(req.session.lid) || hashIdSession.get(req.cookies.loginid) === req.session.id);
}


let hashIdSession = new hashmap();
let members = [];
let writings = [];
app.get('/',function(req,res){
    res.redirect('/login');
});

app.get('/login',function(req,res){
    if(islogined(req)){
        //브라우저가 껐다켜진경우로 req.session.lid가 null, 로그인된것으로처리하고 session의 lid를 추가해줘야함
        if(!req.session.lid){
            req.session.lid = req.cookies.loginid;
            hashIdSession.set(req.cookies.loginid, req.session.id);
        }

        res.send('<script>alert("이미 로그인 되었습니다. 게시판목록 페이지로 이동합니다."); location.href="/boardlist" </script>');
    }else{
        res.render('login');
    }
});

app.post('/loginhandling',function(req,res){
    if(req.body.logout){
        if(req.cookies.loginid)
            hashIdSession.remove(req.cookies.loginid);
            res.clearCookie('loginid');
        if(req.cookies.loginnickname)
            res.clearCookie('loginnickname');
        res.redirect('/login');
    }else{
        
        let rid = req.body.id;
        let rpw = req.body.pw;
        for(let member of members){
            if(rid === member.id && rpw === member.pw){
                //hashmap에 대응되는 session이 이미 있다하더라도 현재 요청한 session_id로 갱신.
                hashIdSession.set(rid, req.session.id);
                res.cookie('loginid', rid, {maxAge : 1000*60*60});
                res.cookie('loginnickname', member.nickname,{maxAge : 1000*60*60 });
                req.session.lid = rid;
                
                res.send('<script>alert("' + member.nickname +'님 안녕하세요"); location.href="/boardlist" </script>');
                return;
            }
        }
        res.send('<script>alert("존재하지 않는 아이디이거나 비번이 틀렸습니다"); location.href="/login" </script>');
    }
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
    if(islogined(req)){
        if(!req.session.lid){
            req.session.lid = req.cookies.loginid;
            hashIdSession.set(req.cookies.loginid, req.session.id);
        }
        res.render('add');
    }else{
        if(req.cookies.loginid)
            res.clearCookie('loginid');
        if(req.cookies.loginnickname)
            res.clearCookie('loginnickname');
        res.send('<script>alert("게시글을 작성하려면 로그인하세요"); location.href="/login" </script>');
    }
});

app.post('/addHandling',function(req,res){
    if(islogined(req)){
        if(!req.session.lid){
            req.session.lid = req.cookies.loginid;
            hashIdSession.set(req.cookies.loginid, req.session.id);
        }

        let curtime = new Date();
    
        writings.push(
            {
                title : req.body.title,
                content : req.body.content,
                writer_id : req.cookies.loginid,
                writer_nickname : req.cookies.loginnickname,
                time : curtime.getFullYear() + '/' +curtime.getMonth() + '/' + curtime.getDate() + ' ' + curtime.getHours() + ' : ' + curtime.getMinutes() ,
            });
        let wid = writings.length-1;
        res.send(`<script>alert("게시글 업로드 완료"); location.href="/board/${wid}" </script>`);
    }else{
        if(req.cookies.loginid)
            res.clearCookie('loginid');
        if(req.cookies.loginnickname)
            res.clearCookie('loginnickname');
        res.send('<script>alert("로그아웃되어 게시글을 업로드 할 수 없습니다. 다시 로그인해주세요"); location.href="/login" </script>');
    }
    
    
});

app.post('/edit', function(req,res){
    if(islogined(req)){
        if(!req.session.lid){
            req.session.lid = req.cookies.loginid;
            hashIdSession.set(req.cookies.loginid, req.session.id);
        }

        if(writings[req.body.id].writer_id != req.cookies.loginid){
            res.send(`<script>alert("타인의 게시글은 수정 불가능합니다"); location.href="/board/${req.body.id}" </script>`);
        }else{
            res.render('edit', {writing : writings[req.body.id], id : req.body.id });
        }
    }else{
        if(req.cookies.loginid)
            res.clearCookie('loginid');
        if(req.cookies.loginnickname)
            res.clearCookie('loginnickname');
        res.send('<script>alert("로그아웃되어 게시글을 수정할 수 없습니다. 다시 로그인해주세요"); location.href="/login" </script>');
    }
    
});

app.post('/editHandling',function(req,res){
    
    if(islogined(req)){
        if(!req.session.lid){
            req.session.lid = req.cookies.loginid;
            hashIdSession.set(req.cookies.loginid, req.session.id);
        }

        let index = req.body.id;
        writings[index].title = req.body.title;
        writings[index].content = req.body.content;
        
        res.send(`<script>alert("게시글 수정 완료"); location.href="/board/${index}" </script>`);
    }else{
        if(req.cookies.loginid)
            res.clearCookie('loginid');
        if(req.cookies.loginnickname)
            res.clearCookie('loginnickname');
        res.send('<script>alert("로그아웃되어 게시글을 수정할 수 없습니다. 다시 로그인해주세요"); location.href="/login" </script>');
    }
});

app.post('/deleteHandling', function(req,res){
    if(islogined(req)){
        if(!req.session.lid){
            req.session.lid = req.cookies.loginid;
            hashIdSession.set(req.cookies.loginid, req.session.id);
        }
        if(writings[req.body.id].writer_id != req.cookies.loginid){
            res.send(`<script>alert("타인의 게시글은 삭제 불가능합니다"); location.href="/board/${req.body.id}" </script>`);
        }else{
            writings.splice(req.body.id,1);
            res.send(`<script>alert("게시글 삭제 완료"); location.href="/boardlist" </script>`);
        }
    }else{
        if(req.cookies.loginid)
            res.clearCookie('loginid');
        if(req.cookies.loginnickname)
            res.clearCookie('loginnickname');
        res.send('<script>alert("로그아웃되어 게시글을 삭제할수 없습니다. 다시 로그인해주세요"); location.href="/login" </script>');
    }
});

app.listen(3000,function(){
    console.log('server connected port : ' + 3000);
});