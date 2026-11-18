'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {DatabaseSync,backup}=require('node:sqlite');
const os=require('node:os');
const {questionsForGrade}=require('./seed');
const PORT=Number(process.env.PORT||3000);
const DB_PATH=path.resolve(process.env.DB_PATH||path.join(__dirname,'data','vocab.sqlite'));
if(process.env.NODE_ENV==='production'&&!process.env.DB_PATH)throw Error('Production requires DB_PATH pointing to a persistent Render disk, e.g. /var/data/vocab.sqlite');
if(process.env.REQUIRE_PERSISTENT_STORAGE==='1'&&!DB_PATH.startsWith('/var/data/'))throw Error('DB_PATH must be below /var/data/ when REQUIRE_PERSISTENT_STORAGE=1');
fs.mkdirSync(path.dirname(DB_PATH),{recursive:true});
const db=new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, passhash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('teacher','student')), display_name TEXT NOT NULL, class_id INTEGER, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES users(id), grade INTEGER NOT NULL, name TEXT NOT NULL, code TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY, grade INTEGER NOT NULL, unit TEXT NOT NULL, type TEXT NOT NULL, word TEXT NOT NULL, prompt TEXT NOT NULL, options TEXT NOT NULL, correct_index INTEGER NOT NULL, explanation TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assignments (id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL REFERENCES classes(id), title TEXT NOT NULL, unit TEXT NOT NULL, duration_sec INTEGER NOT NULL DEFAULT 600, max_attempts INTEGER NOT NULL DEFAULT 2, due_at INTEGER, review_enabled INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS attempts (id INTEGER PRIMARY KEY, assignment_id INTEGER NOT NULL REFERENCES assignments(id), student_id INTEGER NOT NULL REFERENCES users(id), started_at INTEGER NOT NULL, submitted_at INTEGER, order_json TEXT NOT NULL, draft_json TEXT NOT NULL DEFAULT '{}', answers_json TEXT, score REAL, correct_count INTEGER, status TEXT NOT NULL DEFAULT 'active');
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_attempts_assignment ON attempts(assignment_id,student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);
if(!db.prepare('PRAGMA table_info(questions)').all().some(c=>c.name==='audio_text'))db.exec('ALTER TABLE questions ADD COLUMN audio_text TEXT');
if(!db.prepare('PRAGMA table_info(questions)').all().some(c=>c.name==='owner_teacher_id'))db.exec('ALTER TABLE questions ADD COLUMN owner_teacher_id INTEGER REFERENCES users(id)');
if(!db.prepare('PRAGMA table_info(assignments)').all().some(c=>c.name==='access_code'))db.exec('ALTER TABLE assignments ADD COLUMN access_code TEXT');
if(!db.prepare('PRAGMA table_info(assignments)').all().some(c=>c.name==='question_count'))db.exec('ALTER TABLE assignments ADD COLUMN question_count INTEGER NOT NULL DEFAULT 20');
if(!db.prepare('PRAGMA table_info(assignments)').all().some(c=>c.name==='is_open'))db.exec('ALTER TABLE assignments ADD COLUMN is_open INTEGER NOT NULL DEFAULT 1');
// Older assignments keep their IDs and results; assign each a unique access code.
for(const a of db.prepare('SELECT id FROM assignments WHERE access_code IS NULL').all()){
 let code; do { code='KT'+crypto.randomBytes(5).toString('hex').toUpperCase(); } while(db.prepare('SELECT 1 FROM assignments WHERE access_code=?').get(code));
 db.prepare('UPDATE assignments SET access_code=? WHERE id=?').run(code,a.id);
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_access_code ON assignments(access_code)');
const now=()=>Date.now();
const query=(sql,...params)=>db.prepare(sql).all(...params);
const one=(sql,...params)=>db.prepare(sql).get(...params);
const run=(sql,...params)=>db.prepare(sql).run(...params);
const safeJson=(v)=>JSON.parse(v||'{}');
const randomCode=()=>crypto.randomBytes(4).toString('hex').toUpperCase();
function newAccessCode(){let code;do{code='KT'+crypto.randomBytes(5).toString('hex').toUpperCase()}while(one('SELECT id FROM assignments WHERE access_code=?',code));return code}
const passHash=(password)=>{const salt=crypto.randomBytes(16).toString('hex');const hash=crypto.scryptSync(password,salt,64).toString('hex');return `${salt}:${hash}`};
const verify=(password,stored)=>{const [salt,hash]=stored.split(':');if(!salt||!hash)return false;const candidate=crypto.scryptSync(password,salt,64);return crypto.timingSafeEqual(candidate,Buffer.from(hash,'hex'))};
function seed(){
  for(let grade=6;grade<=12;grade++) if(!one('SELECT id FROM questions WHERE grade=? LIMIT 1',grade)) {
    for(const q of questionsForGrade(grade))run('INSERT INTO questions(grade,unit,type,word,prompt,options,correct_index,explanation) VALUES(?,?,?,?,?,?,?,?)',q.grade,q.unit,q.type,q.word,q.prompt,JSON.stringify(q.options),q.answer,q.explanation);
  }
  const existing=one('SELECT id FROM users WHERE role=? LIMIT 1','teacher');
  if(!existing){
    if(process.env.NODE_ENV==='production'&&!process.env.ADMIN_PASSWORD)throw Error('Production requires ADMIN_PASSWORD environment variable');
    const adminPassword=process.env.ADMIN_PASSWORD||'Teacher@123';
    if(adminPassword.length<10)throw Error('ADMIN_PASSWORD must have at least 10 characters');
    run('INSERT INTO users(username,passhash,role,display_name,created_at) VALUES(?,?,?,?,?)',process.env.ADMIN_USERNAME||'teacher',passHash(adminPassword),'teacher','Giáo viên',now());
  }
  if(process.env.DEMO_SEED==='0'||(process.env.NODE_ENV==='production'&&process.env.DEMO_SEED!=='1'))return;
  const teacher=one('SELECT * FROM users WHERE role=? ORDER BY id LIMIT 1','teacher');
  for(let grade=6;grade<=12;grade++){
    let cls=one('SELECT * FROM classes WHERE teacher_id=? AND grade=? LIMIT 1',teacher.id,grade);
    if(!cls){run('INSERT INTO classes(teacher_id,grade,name,code) VALUES(?,?,?,?)',teacher.id,grade,`${grade}A1`,randomCode());cls=one('SELECT * FROM classes WHERE teacher_id=? AND grade=? LIMIT 1',teacher.id,grade)}
    if(!one('SELECT id FROM assignments WHERE class_id=?',cls.id))run('INSERT INTO assignments(class_id,title,unit,duration_sec,max_attempts,created_at,access_code) VALUES(?,?,?,?,?,?,?)',cls.id,`Bài kiểm tra từ vựng lớp ${grade} – Ngày 1`,'Tổng ôn minh họa',600,2,now(),newAccessCode());
    const username=`student${grade}`;
    if(!one('SELECT id FROM users WHERE username=?',username))run('INSERT INTO users(username,passhash,role,display_name,class_id,created_at) VALUES(?,?,?,?,?,?)',username,passHash('Student@123'),'student',`Học sinh mẫu lớp ${grade}`,cls.id,now());
  }
}
seed();
const ROOT=path.join(__dirname,'public');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.ico':'image/x-icon'};
const httpError=(status,message)=>{const e=new Error(message);e.status=status;throw e};
const json=(res,status,obj,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(obj))};
function cookie(req,key){const found=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='));return found?decodeURIComponent(found.substring(key.length+1)):null}
function getUser(req){const token=cookie(req,'evd_session');if(!token)return null;const row=one('SELECT u.id,u.username,u.role,u.display_name,u.class_id,c.name AS class_name,c.grade FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN classes c ON c.id=u.class_id WHERE s.token_hash=? AND s.expires_at>?',crypto.createHash('sha256').update(token).digest('hex'),now());return row||null}
function auth(req,role){if(!req.user)httpError(401,'Vui lòng đăng nhập.');if(role&&req.user.role!==role)httpError(403,'Không có quyền truy cập.');return req.user}
function ownedClass(user,id){const cls=one('SELECT * FROM classes WHERE id=? AND teacher_id=?',Number(id),user.id);if(!cls)httpError(404,'Không tìm thấy lớp thuộc quyền quản lý.');return cls}
function ownedAssignment(user,id){const a=one('SELECT a.*,c.name AS class_name,c.grade,c.teacher_id FROM assignments a JOIN classes c ON c.id=a.class_id WHERE a.id=? AND c.teacher_id=?',Number(id),user.id);if(!a)httpError(404,'Không tìm thấy bài kiểm tra.');return a}
function studentAssignment(user,id){const a=one('SELECT a.*,c.name AS class_name,c.grade FROM assignments a JOIN classes c ON c.id=a.class_id WHERE a.id=? AND a.class_id=?',Number(id),user.class_id);if(!a)httpError(404,'Bài kiểm tra không dành cho lớp của em.');return a}
const shuffle=(arr)=>{const a=[...arr];for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a};
function makeOrder(grade,unit,teacherId,count=20){const all=query('SELECT id FROM questions WHERE grade=? AND unit=? AND (owner_teacher_id IS NULL OR owner_teacher_id=?) ORDER BY id',grade,unit,teacherId);if(all.length<count)httpError(400,`Ngân hàng câu hỏi của Unit này chưa đủ ${count} câu.`);return shuffle(all).slice(0,count).map(q=>({id:q.id,perm:shuffle([0,1,2,3])}));}
const INPUT_TYPES=new Set(['listen-dictation','listen-cloze','listen-reorder']);
const LISTEN_TYPES=new Set(['listen-word','listen-sentence','listen-dictation','listen-cloze','listen-reorder','listen-contrast']);
// Normalize case/spacing; dictation and reordering may ignore terminal punctuation,
// but do not remove words or change spelling. Cloze answers must match the source exactly.
const normalizeWritten=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/[.,!?;:]+$/g,'').replace(/\s+/g,' ').trim();
function correctFor(q,item,answer){if(INPUT_TYPES.has(q.type))return typeof answer==='string'&&normalizeWritten(answer)===normalizeWritten(JSON.parse(q.options)[q.correct_index]);return answer===item.perm.indexOf(q.correct_index)}
function itemsForOrder(order,withAnswers){return order.map(item=>{const q=one('SELECT * FROM questions WHERE id=?',item.id);const input=INPUT_TYPES.has(q.type);const base={id:q.id,type:q.type,prompt:q.prompt,options:input?[]:item.perm.map(i=>safeJson(q.options)[i])};if(LISTEN_TYPES.has(q.type))base.audioText=q.audio_text||q.word;
 if(q.type==='listen-reorder'){const words=(q.audio_text||'').trim().split(/\s+/);base.wordTiles=shuffle(words).map(word=>({word}));}
 if(withAnswers){base.correctIndex=input?null:item.perm.indexOf(q.correct_index);base.correctText=input?safeJson(q.options)[q.correct_index]:null;base.explanation=q.explanation;}return base});}
function sanitizeAnswers(order,raw){const clean={};if(!raw||typeof raw!=='object'||Array.isArray(raw))return clean;for(const item of order){const v=raw[String(item.id)],q=one('SELECT type FROM questions WHERE id=?',item.id);if(INPUT_TYPES.has(q.type)){if(typeof v==='string'&&v.length<=500)clean[String(item.id)]=v;}else if(Number.isInteger(v)&&v>=0&&v<=3)clean[String(item.id)]=v;}return clean}
function finalize(attempt,raw,when){if(attempt.status!=='active')return attempt;const order=safeJson(attempt.order_json);const answers=sanitizeAnswers(order,raw);let correct=0;for(const item of order){const q=one('SELECT type,options,correct_index FROM questions WHERE id=?',item.id);if(correctFor(q,item,answers[String(item.id)]))correct++}
  run("UPDATE attempts SET status='submitted',submitted_at=?,answers_json=?,draft_json=?,score=?,correct_count=? WHERE id=? AND status='active'",when,JSON.stringify(answers),JSON.stringify(answers),Math.round(correct/order.length*1000)/100,correct,attempt.id);
  return one('SELECT * FROM attempts WHERE id=?',attempt.id);
}
function autoExpire(attempt){const a=one('SELECT duration_sec FROM assignments WHERE id=?',attempt.assignment_id);const deadline=attempt.started_at+a.duration_sec*1000;if(attempt.status==='active'&&now()>deadline){return finalize(attempt,safeJson(attempt.draft_json),deadline)}return attempt}
function scoreResponse(user,a,attempt){const reviewAllowed=Boolean(a.review_enabled)||(a.due_at!==null&&now()>a.due_at);const result={id:attempt.id,assignmentId:a.id,status:attempt.status,score:attempt.score,correctCount:attempt.correct_count,total:safeJson(attempt.order_json).length,startedAt:attempt.started_at,submittedAt:attempt.submitted_at,reviewAllowed};if(reviewAllowed){const answers=safeJson(attempt.answers_json);result.review=itemsForOrder(safeJson(attempt.order_json),true).map(item=>({...item,selected:answers[String(item.id)]??null}));}return result}
async function readBody(req){let b='';for await (const chunk of req){b+=chunk;if(b.length>200000)httpError(413,'Dữ liệu gửi lên quá lớn.')}if(!b)return {};try{return JSON.parse(b)}catch{httpError(400,'JSON không hợp lệ.')}}
function checkOrigin(req){if(['GET','HEAD','OPTIONS'].includes(req.method))return;const origin=req.headers.origin;if(!origin)return;const allowed=process.env.PUBLIC_ORIGIN;const hostOrigin=`${req.headers['x-forwarded-proto']==='https'?'https':'http'}://${req.headers.host}`;if(origin!==hostOrigin&&origin!==allowed)httpError(403,'Nguồn yêu cầu không được phép.');}
const loginFailures=new Map();
const quickJoinAttempts=new Map();
function validUsername(s){return typeof s==='string'&&/^[a-zA-Z0-9_.-]{3,32}$/.test(s)}
function userSafe(user){return {id:user.id,username:user.username,role:user.role,displayName:user.display_name,classId:user.class_id,className:user.class_name,grade:user.grade}}
async function api(req,res,url){const route=url.pathname,method=req.method;const body=['POST','PUT','PATCH'].includes(method)?await readBody(req):{};
  if(method==='GET'&&route==='/api/health')return json(res,200,{status:'ok',database:one('SELECT 1 AS alive').alive===1?'ok':'error'});
  if(method==='POST'&&route==='/api/login'){
    const ip=req.socket.remoteAddress||'unknown';const previous=loginFailures.get(ip);if(previous&&previous.count>=12&&now()-previous.since<15*60000)httpError(429,'Quá nhiều lần đăng nhập sai. Hãy thử lại sau.');
    const username=String(body.username||'').trim().toLowerCase();const u=one('SELECT * FROM users WHERE username=?',username);
    if(!u||!verify(String(body.password||''),u.passhash)){const old=loginFailures.get(ip);loginFailures.set(ip,old&&now()-old.since<15*60000?{count:old.count+1,since:old.since}:{count:1,since:now()});httpError(401,'Tên đăng nhập hoặc mật khẩu không đúng.');}loginFailures.delete(ip);
    const token=crypto.randomBytes(32).toString('hex');run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',crypto.createHash('sha256').update(token).digest('hex'),u.id,now()+7*86400000);
    const secure=process.env.NODE_ENV==='production'?'; Secure':'';return json(res,200,{ok:true}, {'Set-Cookie':`evd_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`});
  }
  if(method==='POST'&&route==='/api/register'){
    const username=String(body.username||'').trim().toLowerCase(),password=String(body.password||''),name=String(body.displayName||'').trim(),code=String(body.classCode||'').trim().toUpperCase();
    if(!validUsername(username)||password.length<10||password.length>128||name.length<2||name.length>80)httpError(400,'Tên đăng nhập 3–32 ký tự, mật khẩu tối thiểu 10 ký tự và họ tên hợp lệ.');
    const cls=one('SELECT * FROM classes WHERE code=?',code);if(!cls)httpError(404,'Mã lớp không tồn tại.');
    if(one('SELECT id FROM users WHERE username=?',username))httpError(409,'Tên đăng nhập đã được sử dụng.');
    run('INSERT INTO users(username,passhash,role,display_name,class_id,created_at) VALUES(?,?,?,?,?,?)',username,passHash(password),'student',name,cls.id,now());return json(res,201,{message:'Đăng ký thành công. Hãy đăng nhập.'});
  }
  // Quick-access exam entry: a class-specific stable student code is used for attempt counting.
  // This is a low-assurance identity method: a shared exam code alone cannot prove identity.
  if(method==='POST'&&route==='/api/quick-join'){
    const ip=req.socket.remoteAddress||'unknown';
    const bucket=quickJoinAttempts.get(ip)||{count:0,since:now()};
    if(now()-bucket.since>15*60000){bucket.count=0;bucket.since=now()}
    if(bucket.count>=30)httpError(429,'Quá nhiều lượt thử mã. Vui lòng thử lại sau.');
    bucket.count++;quickJoinAttempts.set(ip,bucket);
    const code=String(body.examCode||'').trim().toUpperCase();
    const studentCode=String(body.studentCode||'').trim().toUpperCase();
    const name=String(body.displayName||'').trim().replace(/\s+/g,' ');
    if(!/^KT[A-F0-9]{10}$/.test(code)||!/^[-A-Z0-9_.]{3,24}$/.test(studentCode)||name.length<2||name.length>80)httpError(400,'Nhập mã bài, họ tên và mã học sinh hợp lệ (3–24 ký tự, không dấu cách).');
    const exam=one('SELECT a.*,c.name AS class_name FROM assignments a JOIN classes c ON c.id=a.class_id WHERE a.access_code=?',code);
    if(!exam)httpError(404,'Mã bài kiểm tra không tồn tại.');
    if(!exam.is_open)httpError(409,'Bài kiểm tra đã được giáo viên đóng.');
    if(exam.due_at!==null&&now()>exam.due_at)httpError(409,'Bài kiểm tra đã hết hạn.');
    const username=`quick_${exam.class_id}_${studentCode.toLowerCase()}`;
    let student=one('SELECT * FROM users WHERE username=?',username);
    if(student){
      if(student.class_id!==exam.class_id||student.role!=='student'||student.display_name.toLocaleLowerCase('vi')!==name.toLocaleLowerCase('vi'))httpError(409,'Mã học sinh đã được dùng với tên khác. Hãy kiểm tra lại hoặc liên hệ giáo viên.');
    }else{
      // Random inaccessible password: quick-access accounts cannot log in using a known password.
      try{run('INSERT INTO users(username,passhash,role,display_name,class_id,created_at) VALUES(?,?,?,?,?,?)',username,passHash(crypto.randomBytes(32).toString('hex')),'student',name,exam.class_id,now())}
      catch(e){if(!String(e.message).includes('UNIQUE'))throw e}
      student=one('SELECT * FROM users WHERE username=?',username);
      if(!student||student.class_id!==exam.class_id||student.display_name.toLocaleLowerCase('vi')!==name.toLocaleLowerCase('vi'))httpError(409,'Mã học sinh đã được sử dụng.');
    }
    const token=crypto.randomBytes(32).toString('hex');
    run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',crypto.createHash('sha256').update(token).digest('hex'),student.id,now()+86400000);
    const secure=process.env.NODE_ENV==='production'?'; Secure':'';
    return json(res,200,{ok:true,assignmentId:exam.id,className:exam.class_name,examTitle:exam.title},{'Set-Cookie':`evd_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${secure}`});
  }
  req.user=getUser(req);
  if(method==='POST'&&route==='/api/logout'){
    const token=cookie(req,'evd_session');if(token)run('DELETE FROM sessions WHERE token_hash=?',crypto.createHash('sha256').update(token).digest('hex'));
    return json(res,200,{ok:true},{'Set-Cookie':'evd_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'});
  }
  if(method==='GET'&&route==='/api/me')return json(res,200,{user:req.user?userSafe(req.user):null});
  if(method==='GET'&&route==='/api/student/assignments'){
    const u=auth(req,'student');const rows=query(`SELECT a.*,c.name AS class_name,(SELECT COUNT(*) FROM attempts t WHERE t.assignment_id=a.id AND t.student_id=?) AS used_attempts,(SELECT COUNT(*) FROM attempts t WHERE t.assignment_id=a.id AND t.student_id=? AND t.status='submitted') AS completed_attempts,(SELECT MAX(score) FROM attempts t WHERE t.assignment_id=a.id AND t.student_id=? AND t.status='submitted') AS best_score,(SELECT COUNT(*) FROM attempts t WHERE t.assignment_id=a.id AND t.student_id=? AND t.status='active') AS active_attempts FROM assignments a JOIN classes c ON c.id=a.class_id WHERE a.class_id=? AND a.is_open=1 ORDER BY a.created_at DESC`,u.id,u.id,u.id,u.id,u.class_id);
    return json(res,200,{assignments:rows});
  }
  if(method==='GET'&&/^\/api\/student\/results\/\d+$/.test(route)){
    const u=auth(req,'student'),id=Number(route.split('/')[4]),a=studentAssignment(u,id);
    const t=one("SELECT * FROM attempts WHERE assignment_id=? AND student_id=? AND status='submitted' ORDER BY submitted_at DESC LIMIT 1",a.id,u.id);
    if(!t)httpError(404,'Chưa có kết quả đã nộp.');return json(res,200,{result:scoreResponse(u,a,t)});
  }
  if(method==='POST'&&/^\/api\/student\/assignments\/\d+\/start$/.test(route)){
    const u=auth(req,'student'),id=Number(route.split('/')[4]),a=studentAssignment(u,id);
    if(!a.is_open)httpError(409,'Giáo viên đã đóng bài kiểm tra.');
    if(a.due_at!==null&&now()>a.due_at)httpError(409,'Bài đã hết hạn.');
    const attempts=query('SELECT * FROM attempts WHERE assignment_id=? AND student_id=? ORDER BY id DESC',a.id,u.id);
    const ongoing=attempts.find(t=>t.status==='active');if(ongoing){const checked=autoExpire(ongoing);if(checked.status==='active')return json(res,200,{attemptId:checked.id});}
    if(attempts.length>=a.max_attempts)httpError(409,'Em đã dùng hết lượt làm bài.');
    const teacherId=one('SELECT teacher_id FROM classes WHERE id=?',a.class_id).teacher_id;const order=makeOrder(a.grade,a.unit,teacherId,a.question_count);const result=run('INSERT INTO attempts(assignment_id,student_id,started_at,order_json) VALUES(?,?,?,?)',a.id,u.id,now(),JSON.stringify(order));return json(res,201,{attemptId:Number(result.lastInsertRowid)});
  }
  if(/^\/api\/student\/attempts\/\d+$/.test(route)&&method==='GET'){
    const u=auth(req,'student'),id=Number(route.split('/')[4]);let t=one('SELECT * FROM attempts WHERE id=? AND student_id=?',id,u.id);if(!t)httpError(404,'Không tìm thấy lượt làm bài.');t=autoExpire(t);const a=studentAssignment(u,t.assignment_id);
    if(t.status==='submitted')return json(res,200,{result:scoreResponse(u,a,t)});
    return json(res,200,{attempt:{id:t.id,title:a.title,startedAt:t.started_at,serverNow:now(),expiresAt:t.started_at+a.duration_sec*1000,questions:itemsForOrder(safeJson(t.order_json),false),answers:safeJson(t.draft_json)}});
  }
  if(/^\/api\/student\/attempts\/\d+\/(save|submit)$/.test(route)&&method==='POST'){
    const u=auth(req,'student');const parts=route.split('/'),id=Number(parts[4]);let t=one('SELECT * FROM attempts WHERE id=? AND student_id=?',id,u.id);if(!t)httpError(404,'Lượt làm không tồn tại.');const a=studentAssignment(u,t.assignment_id);t=autoExpire(t);
    if(t.status==='submitted')return json(res,200,{result:scoreResponse(u,a,t)});
    const answers=sanitizeAnswers(safeJson(t.order_json),body.answers);
    if(parts[5]==='save'){run("UPDATE attempts SET draft_json=? WHERE id=? AND status='active'",JSON.stringify(answers),id);return json(res,200,{saved:true,serverNow:now()})}
    t=finalize(t,answers,now());return json(res,200,{result:scoreResponse(u,a,t)});
  }
  if(method==='GET'&&route==='/api/teacher/classes'){
    const u=auth(req,'teacher');const classes=query(`SELECT c.*,(SELECT COUNT(*) FROM users s WHERE s.class_id=c.id AND s.role='student') AS student_count FROM classes c WHERE c.teacher_id=? ORDER BY c.grade,c.name`,u.id);return json(res,200,{classes});
  }
  if(method==='POST'&&route==='/api/teacher/classes'){
    const u=auth(req,'teacher'),grade=Number(body.grade),name=String(body.name||'').trim();if(!Number.isInteger(grade)||grade<6||grade>12||name.length<2||name.length>60)httpError(400,'Tên lớp hoặc khối lớp không hợp lệ.');
    const code=randomCode();const r=run('INSERT INTO classes(teacher_id,grade,name,code) VALUES(?,?,?,?)',u.id,grade,name,code);return json(res,201,{id:Number(r.lastInsertRowid),code});
  }
  if(method==='GET'&&route==='/api/teacher/question-bank'){
    const u=auth(req,'teacher'),grade=Number(url.searchParams.get('grade'));if(!Number.isInteger(grade)||grade<6||grade>12)httpError(400,'Khối lớp không hợp lệ.');
    const units=query('SELECT unit,COUNT(*) AS count FROM questions WHERE grade=? AND (owner_teacher_id IS NULL OR owner_teacher_id=?) GROUP BY unit ORDER BY unit',grade,u.id);
    const recent=query('SELECT id,unit,word,prompt,options,correct_index,explanation,type,audio_text FROM questions WHERE grade=? AND owner_teacher_id=? ORDER BY id DESC LIMIT 50',grade,u.id).map(x=>({...x,options:JSON.parse(x.options)}));
    return json(res,200,{grade,units,recent});
  }
  if(method==='POST'&&route==='/api/teacher/question-bank'){
    const u=auth(req,'teacher'),grade=Number(body.grade),unit=String(body.unit||'').trim(),rows=body.questions;
    if(!Number.isInteger(grade)||grade<6||grade>12||unit.length<2||unit.length>100||!Array.isArray(rows)||rows.length<1||rows.length>200)httpError(400,'Khối, Unit hoặc số câu không hợp lệ (1–200 câu/lần).');
    const clean=rows.map((q,i)=>{
      const word=String(q.word||'').trim(),prompt=String(q.prompt||'').trim(),explanation=String(q.explanation||'').trim();
      const options=Array.isArray(q.options)?q.options.map(v=>String(v).trim()):[];
      const answer=Number(q.answer);
      const type=String(q.type||'context'),audioText=String(q.audioText||'').trim();
      if(!['context','listen-word','listen-sentence','listen-dictation','listen-cloze','listen-reorder','listen-contrast'].includes(type)||(LISTEN_TYPES.has(type)&&(!audioText||audioText.length>400||/[<>]/.test(audioText))))httpError(400,`Câu ${i+1}: nội dung nghe không hợp lệ.`);
      if(word.length<1||word.length>100||prompt.length<8||prompt.length>500||explanation.length>1000||options.length!==4||options.some(v=>v.length<1||v.length>250)||new Set(options.map(v=>v.toLowerCase())).size!==4||!Number.isInteger(answer)||answer<0||answer>3)httpError(400,`Câu ${i+1} không hợp lệ: cần câu hỏi rõ ràng, 4 đáp án khác nhau và đáp án đúng A–D.`);
      if(INPUT_TYPES.has(type)&&(!options[answer]||options[answer].length>250))httpError(400,`Câu ${i+1}: chưa có đáp án viết chính xác.`);
      if(type==='listen-cloze'&&!normalizeWritten(audioText).includes(normalizeWritten(options[answer])))httpError(400,`Câu ${i+1}: từ cần điền không có trong câu nghe.`);
      if(type==='listen-reorder'&&normalizeWritten(audioText)!==normalizeWritten(options[answer]))httpError(400,`Câu ${i+1}: đáp án sắp xếp phải đúng nguyên văn câu nghe.`);
      return {word,prompt,explanation,options,answer,type,audioText};
    });
    const normalize=t=>t.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();
    const existing=query('SELECT prompt,options,type,audio_text FROM questions WHERE grade=? AND unit=? AND (owner_teacher_id IS NULL OR owner_teacher_id=?)',grade,unit,u.id);
    const keys=new Set(existing.map(q=>normalize(q.prompt)+'|'+JSON.parse(q.options).map(normalize).sort().join('|')+'|'+(q.type||'context')+'|'+normalize(q.audio_text||'')));
    let created=0,skipped=0;
    db.exec('BEGIN IMMEDIATE');try{for(const q of clean){
      const k=normalize(q.prompt)+'|'+q.options.map(normalize).sort().join('|')+'|'+q.type+'|'+normalize(q.audioText);
      if(keys.has(k)){skipped++;continue}
      run('INSERT INTO questions(grade,unit,type,word,prompt,options,correct_index,explanation,owner_teacher_id,audio_text) VALUES(?,?,?,?,?,?,?,?,?,?)',grade,unit,q.type,q.word,q.prompt,JSON.stringify(q.options),q.answer,q.explanation,u.id,q.audioText||null);keys.add(k);created++;
    }db.exec('COMMIT')}catch(err){db.exec('ROLLBACK');throw err}
    const count=one('SELECT COUNT(*) AS n FROM questions WHERE grade=? AND unit=? AND (owner_teacher_id IS NULL OR owner_teacher_id=?)',grade,unit,u.id).n;
    return json(res,201,{created,skipped,count,ready:count>=5});
  }
  // Generate objective two-way vocabulary questions from an approved word–meaning list.
  // Do not pretend to generate accurate contextual cloze sentences from definitions alone.
  if(method==='POST'&&route==='/api/teacher/vocab-generate'){
    const u=auth(req,'teacher'),grade=Number(body.grade),unit=String(body.unit||'').trim(),raw=String(body.text||'');
    if(!Number.isInteger(grade)||grade<6||grade>12||unit.length<2||unit.length>100||raw.length>30000)httpError(400,'Khối, chủ đề hoặc dữ liệu quá dài.');
    const vocab=raw.split(/\r?\n/).filter(x=>x.trim()).map((line,i)=>{
      const bits=line.split(/\t|\s+[–—]\s+/).map(x=>x.trim());
      if(bits.length<2||!bits[0]||!bits[1])httpError(400,`Dòng ${i+1}: cần TỪ [TAB] NGHĨA.`);
      return {word:bits[0],meaning:bits[1]};
    });
    if(vocab.length<4||vocab.length>100)httpError(400,'Cần từ 4 đến 100 cặp từ–nghĩa trong mỗi lượt.');
    const canon=s=>s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
    if(new Set(vocab.map(v=>canon(v.word))).size!==vocab.length||new Set(vocab.map(v=>canon(v.meaning))).size!==vocab.length)httpError(400,'Có từ hoặc nghĩa trùng nhau. Hãy sửa trước khi tạo câu hỏi để tránh nhiều đáp án đúng.');
    if(vocab.some(v=>v.word.length>100||v.meaning.length>200))httpError(400,'Từ hoặc nghĩa quá dài.');
    const generated=[];
    for(let i=0;i<vocab.length;i++){
      const v=vocab[i];const distractors=[1,2,3].map(j=>vocab[(i+j)%vocab.length]);
      for(const direction of ['en-vi','vi-en']){
        const options=shuffle(direction==='en-vi'?[v.meaning,...distractors.map(t=>t.meaning)]:[v.word,...distractors.map(t=>t.word)]);
        const answer=options.indexOf(direction==='en-vi'?v.meaning:v.word);
        generated.push({word:v.word,prompt:direction==='en-vi'?`Từ “${v.word}” có nghĩa là gì?`:`“${v.meaning}” trong tiếng Anh là gì?`,options,answer,explanation:`${v.word} = ${v.meaning}`});
      }
    }
    return json(res,200,{grade,unit,generated,warning:'Đây là câu hỏi nhận biết từ–nghĩa tự động, giáo viên cần duyệt các phương án nhiễu và nghĩa trước khi nhập.'});
  }
  if(method==='PATCH'&&/^\/api\/teacher\/questions\/\d+$/.test(route)){
    const u=auth(req,'teacher'),id=Number(route.split('/')[4]);
    const old=one('SELECT * FROM questions WHERE id=? AND owner_teacher_id=?',id,u.id);
    if(!old)httpError(404,'Chỉ sửa được câu hỏi do bạn tạo.');
    const word=String(body.word||'').trim(),prompt=String(body.prompt||'').trim(),explanation=String(body.explanation||'').trim();
    const options=Array.isArray(body.options)?body.options.map(v=>String(v).trim()):[];const answer=Number(body.answer);
    if(word.length<1||word.length>100||prompt.length<8||prompt.length>500||explanation.length>1000||options.length!==4||options.some(v=>!v||v.length>250)||new Set(options.map(v=>v.toLowerCase())).size!==4||!Number.isInteger(answer)||answer<0||answer>3)httpError(400,'Câu hỏi cần có 4 đáp án khác nhau và một đáp án đúng.');
    // Existing attempts depend on answer keys: prohibit editing used questions.
    const used=one('SELECT id FROM attempts WHERE order_json LIKE ? LIMIT 1',`%"id":${id},%`);
    if(used)httpError(409,'Câu hỏi đã xuất hiện trong lượt làm; không thể sửa đáp án. Hãy tạo câu mới.');
    run('UPDATE questions SET word=?,prompt=?,options=?,correct_index=?,explanation=? WHERE id=?',word,prompt,JSON.stringify(options),answer,explanation,id);
    return json(res,200,{ok:true});
  }
  if(method==='DELETE'&&/^\/api\/teacher\/questions\/\d+$/.test(route)){
    const u=auth(req,'teacher'),id=Number(route.split('/')[4]);
    const q=one('SELECT id FROM questions WHERE id=? AND owner_teacher_id=?',id,u.id);if(!q)httpError(404,'Không có quyền xóa câu hỏi này.');
    // Never delete a question if any attempt may reference it (including historical results).
    const used=one('SELECT id FROM attempts WHERE order_json LIKE ? LIMIT 1',`%"id":${id},%`);
    if(used)httpError(409,'Câu hỏi đã sử dụng trong bài làm, không thể xóa để bảo toàn lịch sử.');
    run('DELETE FROM questions WHERE id=?',id);return json(res,200,{ok:true});
  }
  if(method==='GET'&&route==='/api/teacher/assignments'){
    const u=auth(req,'teacher');const assignments=query('SELECT a.*,c.name AS class_name,c.grade FROM assignments a JOIN classes c ON c.id=a.class_id WHERE c.teacher_id=? ORDER BY a.id DESC',u.id);return json(res,200,{assignments});
  }
  if(method==='POST'&&route==='/api/teacher/assignments'){
    const u=auth(req,'teacher'),cls=ownedClass(u,body.classId),title=String(body.title||'').trim(),unit=String(body.unit||'Tổng ôn minh họa').trim(),questionCount=Number(body.questionCount||20),durationMinutes=Number(body.durationMinutes||10),maxAttempts=Number(body.maxAttempts||2);
    if(![5,10,15,20,30,50].includes(questionCount)||!Number.isInteger(durationMinutes)||durationMinutes<3||durationMinutes>60||!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>3)httpError(400,'Số câu, thời gian hoặc số lượt không hợp lệ.');
    if(title.length<4||title.length>120||unit.length>100)httpError(400,'Tiêu đề bài kiểm tra không hợp lệ.');
    const deadline=body.dueAt?Date.parse(body.dueAt):null;if(deadline!==null&&(!Number.isFinite(deadline)||deadline<=now()))httpError(400,'Hạn nộp phải là thời điểm trong tương lai.');
    const available=one('SELECT COUNT(*) AS n FROM questions WHERE grade=? AND unit=? AND (owner_teacher_id IS NULL OR owner_teacher_id=?)',cls.grade,unit,u.id).n;if(available<questionCount)httpError(400,`Chủ đề “${unit}” chỉ có ${available} câu, cần ít nhất ${questionCount} câu.`);
    const code=newAccessCode();const r=run('INSERT INTO assignments(class_id,title,unit,duration_sec,max_attempts,due_at,review_enabled,created_at,access_code,question_count) VALUES(?,?,?,?,?,?,?,?,?,?)',cls.id,title,unit,durationMinutes*60,maxAttempts,deadline,body.reviewEnabled?1:0,now(),code,questionCount);return json(res,201,{id:Number(r.lastInsertRowid),accessCode:code});
  }
  if(method==='PATCH'&&/^\/api\/teacher\/assignments\/\d+\/status$/.test(route)){
    const u=auth(req,'teacher'),id=Number(route.split('/')[4]),a=ownedAssignment(u,id);
    if(typeof body.isOpen!=='boolean')httpError(400,'Trạng thái không hợp lệ.');
    run('UPDATE assignments SET is_open=? WHERE id=?',body.isOpen?1:0,a.id);
    return json(res,200,{ok:true,isOpen:body.isOpen});
  }
  if(method==='GET'&&route==='/api/teacher/dashboard'){
    const u=auth(req,'teacher'),id=Number(url.searchParams.get('assignmentId'));const a=ownedAssignment(u,id);
    const students=query('SELECT id,username,display_name FROM users WHERE role=? AND class_id=? ORDER BY display_name','student',a.class_id);
    const attempts=query("SELECT t.id,t.student_id,t.started_at,t.submitted_at,t.score,t.correct_count,t.status FROM attempts t JOIN users s ON s.id=t.student_id WHERE t.assignment_id=? AND s.class_id=? ORDER BY t.started_at DESC",a.id,a.class_id);
    const rows=students.map(s=>{const mine=attempts.filter(t=>t.student_id===s.id);const done=mine.filter(t=>t.status==='submitted');return {studentId:s.id,name:s.display_name,username:s.username,attempts:mine.length,completed:done.length,bestScore:done.length?Math.max(...done.map(t=>t.score)):null,latestScore:done.length?done[0].score:null,lastSubmitted:done.length?done[0].submitted_at:null,status:done.length?'Đã làm':mine.length?'Đang làm':'Chưa làm'}});
    const completed=rows.filter(r=>r.completed>0),allScores=completed.map(r=>r.latestScore);
    const stats={totalStudents:students.length,studentsCompleted:completed.length,studentsMissing:students.length-completed.length,completionRate:students.length?Math.round(completed.length/students.length*100):0,totalAttempts:attempts.length,submittedAttempts:attempts.filter(t=>t.status==='submitted').length,averageScore:allScores.length?Math.round(allScores.reduce((a,b)=>a+b,0)/allScores.length*100)/100:null,highestScore:allScores.length?Math.max(...allScores):null,lowestScore:allScores.length?Math.min(...allScores):null,aboveEight:allScores.filter(s=>s>=8).length};
    const daily=[];for(let i=6;i>=0;i--){const date=new Date(now()-i*86400000);const key=date.toISOString().slice(0,10);daily.push({date:key,count:attempts.filter(t=>t.submitted_at&&new Date(t.submitted_at).toISOString().slice(0,10)===key).length});}
    const wrongCounts={};for(const t of attempts.filter(t=>t.status==='submitted')){const detail=one('SELECT order_json,answers_json FROM attempts WHERE id=?',t.id);const answers=safeJson(detail.answers_json);for(const item of safeJson(detail.order_json)){const q=one('SELECT word,type,options,correct_index FROM questions WHERE id=?',item.id);if(!correctFor(q,item,answers[String(item.id)]))wrongCounts[q.word]=(wrongCounts[q.word]||0)+1;}}
    const hardest=Object.entries(wrongCounts).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([word,count])=>({word,count}));
    return json(res,200,{assignment:a,stats,students:rows,attempts:attempts.map(t=>({...t,name:students.find(s=>s.id===t.student_id)?.display_name||'—'})),daily,hardest});
  }
  if(method==='GET'&&route==='/api/teacher/backup'){
    auth(req,'teacher');
    // SQLite backup API makes a consistent snapshot while writes continue.
    const tmp=path.join(os.tmpdir(),`evd-backup-${crypto.randomUUID()}.sqlite`);
    try{
      await backup(db,tmp);
      res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="english-vocab-daily-${new Date().toISOString().slice(0,10)}.sqlite"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      const stream=fs.createReadStream(tmp);
      stream.on('close',()=>fs.promises.unlink(tmp).catch(()=>{}));
      stream.on('error',err=>{console.error('Backup transfer failed',err);fs.promises.unlink(tmp).catch(()=>{});res.destroy(err)});
      return stream.pipe(res);
    }catch(err){fs.promises.unlink(tmp).catch(()=>{});throw err}
  }
  if(method==='GET'&&route==='/api/teacher/export'){
    const u=auth(req,'teacher'),a=ownedAssignment(u,Number(url.searchParams.get('assignmentId')));
    const rows=query("SELECT s.display_name AS name,s.username,t.id,t.started_at,t.submitted_at,t.score,t.correct_count,t.status FROM attempts t JOIN users s ON s.id=t.student_id WHERE t.assignment_id=? ORDER BY s.display_name,t.started_at",a.id);
    const lines=[['Học sinh','Tài khoản','Lượt','Bắt đầu','Nộp bài','Điểm /10','Số câu đúng','Trạng thái'],...rows.map(x=>[x.name,x.username,x.id,new Date(x.started_at).toISOString(),x.submitted_at?new Date(x.submitted_at).toISOString():'',x.score??'',x.correct_count??'',x.status])];
    const escapeCsv=v=>'"'+String(v).replace(/^[=+@\-\t\r]/,'\'$&').replace(/"/g,'""')+'"';const csv='\ufeff'+lines.map(row=>row.map(escapeCsv).join(',')).join('\r\n');
    res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="assignment-${a.id}.csv"`,'Cache-Control':'no-store'});return res.end(csv);
  }
  httpError(404,'Đường dẫn API không tồn tại.');
}
const server=http.createServer(async(req,res)=>{
 try{
   const url=new URL(req.url,'http://localhost');checkOrigin(req);
   if(url.pathname.startsWith('/api/'))return await api(req,res,url);
   if(req.method!=='GET'&&req.method!=='HEAD')httpError(405,'Phương thức không hợp lệ.');
   const file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).replace(/^\/+/, '');
   const safePath=path.resolve(ROOT,file);if(!safePath.startsWith(ROOT+path.sep)&&safePath!==ROOT)httpError(403,'Đường dẫn không hợp lệ.');
   if(!fs.existsSync(safePath)||!fs.statSync(safePath).isFile())httpError(404,'Không tìm thấy trang.');
   res.writeHead(200,{'Content-Type':MIME[path.extname(safePath)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'Cache-Control':'no-cache'});
   return fs.createReadStream(safePath).pipe(res);
 }catch(e){if(!res.headersSent)json(res,e.status||500,{error:e.status?e.message:'Lỗi máy chủ. Vui lòng thử lại.'});if(!e.status)console.error(e)}
});
server.listen(PORT,()=>console.log(`English Vocab Daily: http://localhost:${PORT}`));

function shutdown(){console.log('Closing database...');server.close(()=>{try{db.exec('PRAGMA wal_checkpoint(TRUNCATE)');db.close()}finally{process.exit(0)}});setTimeout(()=>process.exit(1),9500).unref()}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
