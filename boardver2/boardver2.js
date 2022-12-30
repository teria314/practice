express = require('express');
session = require('express-session');
bodyParser = require('body-parser');
cookieParser = require('cookie-parser');
FileStore = require('session-file-store')(session);
hashmap = require('hashmap');
passport = require('passport');
LocalStrategy = require('passport-local').Strategy;
GoogleStrategy = require('passport-google-oauth20').Strategy;


app = express();
app.set('view engine', 'jade');
app.set('views','./views');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new FileStore({
        //30초마다 필요없는 만료된 session삭제
        reapInterval: 30,
    }),
    name: 'connect.sid',
    //10분수명
    cookie:{maxAge:10*60*1000},
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
    usernameField: 'id',
    passwordField: 'pw',
},function(username,password,done){
    for(let member of members){
        if(username === member.id){
            if(password === member.pw){
                //인증 성공
                return done(null, member);
            }else{
                //id o pw x
                return done(null, false, {message: 'Incorrect password'});
            }
        }
    }
    //id x
    return done(null, false, {message: 'Incorrect username.'});

}));

passport.use(new GoogleStrategy(
    {
        clientID: '63055292563-qcrfifcbf69j9l1gfv87ckf4q1vcoa47.apps.googleusercontent.com',
        clientSecret: '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',
        callbackURL: '/googlecallback',
        scope: [ 'profile' ]
    }, function(accessToekn, refreshToekn, profile, done){

    for(let member of members){
        if(member.provider === 'google' && profile.id === member.id){
            //이미 전에 로그인한적 있어서 회원정보에 데이터가 있음
            return done(null, member);
        }
    }
    //처음 로그인하는 경우로 회원정보를 추가해야함
    let newMember = {
        providerId : profile.id,
        nickname : profile.displayName,
        provider : 'google',
    };

    members.push(newMember);
    return done(null, newMember);
}));

passport.serializeUser(function(user,done){
    if(user.provider){//구글계정 회원인경우
        done(null, user.providerId);
    }else{//local 회원인 경우
        done(null, user.id);
    }
});

passport.deserializeUser(function(id,done){
    for(let member of members){
        if(member.id && id === member.id){  //local 회원인 경우
            return done(null, member);
        }else if(member.providerId && id === member.providerId){    //구글계정 회원인경우
            return done(null, member);
        }
    }
});


//google id와 local계정의 id가 중복될수있으므로 따로 만들어둠
let hashIdSession = new hashmap();
let googleHashIdSession = new hashmap();

let members = [];
let writings = [];
app.get('/',function(req,res){
    req.session.save(function(){
        res.redirect('/login');
    });
});

app.get('/login',function(req,res){
    if(req.isAuthenticated()){
        res.send('<script>alert("이미 로그인 되었습니다. 게시판목록 페이지로 이동합니다."); location.href="/boardlist" </script>');
    }else{
        res.render('login');
    }
});

//로그아웃처리, 로그인(local만) 처리
app.post('/loginhandling', function(req,res,next){
    if(req.body.logout){
        if(req.isAuthenticated()){
            if(req.user.provider){//구글계정이면
                googleHashIdSession.remove(req.user.providerId);
            }else{//local 계정이면
                hashIdSession.remove(req.user.id);
            }

            //로그아웃시키면 쿠키,세션삭제까지 다 처리해준다고 한다.
            req.logout((err)=>{
                res.redirect('/login');
            });
            
        }else{
            res.redirect('/login');
        }
        
        
    }else{
        passport.authenticate('local',function(authError, user, info){
            if(!user){//로그인 실패(id가 없거나 비밀번호 불일치)
                return res.send('<script>alert("존재하지 않는 아이디이거나 비번이 틀렸습니다"); location.href="/login" </script>');
            }

            return req.login(user, function(loginError){
                if(loginError){
                    console.log(loginError);
                    return next(loginError);
                }else{
                    //중복로그인처리
                    req.sessionStore.destroy(hashIdSession.get(req.body.id),(error)=>{});
                    
                    hashIdSession.set(req.body.id, req.session.id);
                    res.send('<script>alert("' + req.user.nickname +'님 안녕하세요"); location.href="/boardlist" </script>');
                    return;
                }
            })
        })(req,res, next);
    }
});

app.get('/googleloginhandling', passport.authenticate('google', { scope: ['profile']}));
app.get('/googlecallback', function(req,res,next){
    passport.authenticate('google', function(authError, user, info){
        if(!user){//로그인 실패(id가 없거나 비밀번호 불일치)
            return res.send('<script>location.href="/login" </script>');
        }

        return req.login(user, function(loginError){
            if(loginError){
                console.log(loginError);
                return next(loginError);
            }else{
                //중복로그인처리
                req.sessionStore.destroy(googleHashIdSession.get(req.user.providerId),(error)=>{});
                
                googleHashIdSession.set(req.user.providerId, req.session.id);
                res.send('<script>alert("' + req.user.nickname +'님 안녕하세요"); location.href="/boardlist" </script>');
                return;
            }
        })
    })(req,res,next);
});


app.get('/join',function(_req,res){
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

app.get('/boardlist',function(_req,res){
    res.render('boardlist', {list: writings});
});

app.get('/board/:id',function(req,res){
    res.render('board', {writing : writings[req.params.id], id : req.params.id });
});

app.get('/add',function(req,res){
    if(req.isAuthenticated()){
        res.render('add');
    }else{
        res.send('<script>alert("게시글을 작성하려면 로그인하세요"); location.href="/login" </script>');
    }
});

app.post('/addHandling',function(req,res){
    if(req.isAuthenticated()){
        let curtime = new Date();
    
        let writer_id;
        if(req.user.provider){//구글계정일경우
            writer_id = req.user.providerId;
        }else{//로컬계정일 경우
            writer_id = req.user.id;
        }
        writings.push(
            {
                title : req.body.title,
                content : req.body.content,
                writer_id : writer_id,
                writer_nickname : req.user.nickname,
                time : curtime.getFullYear() + '/' +curtime.getMonth() + '/' + curtime.getDate() + ' ' + curtime.getHours() + ' : ' + curtime.getMinutes() ,
            });
        let wid = writings.length-1;
        res.send(`<script>alert("게시글 업로드 완료"); location.href="/board/${wid}" </script>`);
    }else{
        res.send('<script>alert("로그아웃되어 게시글을 업로드 할 수 없습니다. 다시 로그인해주세요"); location.href="/login" </script>');
    }
    
    
});

app.post('/edit', function(req,res){
    if(req.isAuthenticated()){
        //구글계정 id와 local계정 id가 동일한 경우까지 고려한 조건문, 구글id와 local id가 같아도 다른계정으로 생각
        if((req.user.provider && writings[req.body.id].writer_id != req.user.providerId)||(!req.user.provider && writings[req.body.id].writer_id != req.user.id)){
            res.send(`<script>alert("타인의 게시글은 수정 불가능합니다"); location.href="/board/${req.body.id}" </script>`);
        }else{
            res.render('edit', {writing : writings[req.body.id], id : req.body.id });
        }
    }else{
        res.send('<script>alert("로그아웃되어 게시글을 수정할 수 없습니다. 다시 로그인해주세요"); location.href="/login" </script>');
    }
    
});

app.post('/editHandling',function(req,res){
    
    if(req.isAuthenticated()){
        let index = req.body.id;
        writings[index].title = req.body.title;
        writings[index].content = req.body.content;
        
        res.send(`<script>alert("게시글 수정 완료"); location.href="/board/${index}" </script>`);
    }else{
        res.send('<script>alert("로그아웃되어 게시글을 수정할 수 없습니다. 다시 로그인해주세요"); location.href="/login" </script>');
    }
});

app.post('/deleteHandling', function(req,res){
    if(req.isAuthenticated()){
        if((req.user.provider && writings[req.body.id].writer_id != req.user.providerId)||(!req.user.provider && writings[req.body.id].writer_id != req.user.id)){
            res.send(`<script>alert("타인의 게시글은 삭제 불가능합니다"); location.href="/board/${req.body.id}" </script>`);
        }else{
            writings.splice(req.body.id,1);
            res.send(`<script>alert("게시글 삭제 완료"); location.href="/boardlist" </script>`);
        }
    }else{
        res.send('<script>alert("로그아웃되어 게시글을 삭제할수 없습니다. 다시 로그인해주세요"); location.href="/login" </script>');
    }
});

app.listen(3000,function(){
    console.log('server connected port : ' + 3000);
});