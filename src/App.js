// src/App.js
import { useState, useEffect, useCallback, memo, useRef } from "react";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, serverTimestamp, onSnapshot
} from "firebase/firestore";
import { auth, db } from "./firebase";

const BANKS = [
  "التجاري الوطني","الجمهورية","الأمان","الوحدة",
  "شمال أفريقيا","التجارة والتنمية","المتوسط","الاتحاد","أخرى"
];

const EMPTY = {
  name:"",bankType:"",bankTypeOther:"",phone1:"",phone2:"",nationalId:"",
  accountNumber:"",iban:"",amount:"",currency:"د.ل",
  purchasedBy:"",paymentType:"",cardBooked:false,bookingDate:"",
  pinCode:"",soldTo:"",isSold:false,notes:""
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root,.dark{
  --bg:#0a1628;--navy2:#0f2040;--navy3:#162d52;
  --gold:#c9a84c;--gold2:#e8c96a;
  --white:#f8f6f0;--gray:#8a9ab5;--gray2:#c5cedd;
  --ok:#2ecc71;--err:#e74c3c;--warn:#f39c12;--sold:#6b7a99;
  --border:rgba(201,168,76,0.2);--card:rgba(255,255,255,0.03);
}
.light{
  --bg:#eef2f9;--navy2:#ffffff;--navy3:#dde4f0;
  --gold:#b8860b;--gold2:#d4a017;
  --white:#1a1a2e;--gray:#6b7a99;--gray2:#4a5568;
  --ok:#27ae60;--err:#c0392b;--warn:#d68910;--sold:#adb5c7;
  --border:rgba(184,134,11,0.25);--card:rgba(0,0,0,0.03);
}
html,body,#root{font-family:'Tajawal',sans-serif;direction:rtl;min-height:100%}
body{background:var(--bg);color:var(--white);min-height:100vh;transition:background .25s,color .25s}

/* AUTH */
.aw{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;
  background:linear-gradient(135deg,#050d1a,#0a1628,#0d1f3c)}
.ac{background:rgba(15,32,64,.97);border:1px solid var(--border);border-radius:20px;
  padding:36px 28px;width:100%;max-width:400px;box-shadow:0 8px 40px rgba(0,0,0,.5)}
.al2{text-align:center;margin-bottom:24px}
.li{width:60px;height:60px;background:linear-gradient(135deg,var(--gold),var(--gold2));
  border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px}
.al2 h1{font-size:17px;font-weight:900;color:#f8f6f0}
.al2 p{font-size:11px;color:#8a9ab5;margin-top:2px}
.tabs{display:flex;background:rgba(0,0,0,.25);border-radius:10px;padding:3px;margin-bottom:20px}
.tab{flex:1;padding:9px;border:none;background:none;color:#8a9ab5;cursor:pointer;
  border-radius:7px;font-family:'Tajawal',sans-serif;font-size:14px;transition:all .2s}
.tab.on{background:var(--gold);color:#0a1628;font-weight:700}
.me{background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);border-radius:8px;
  padding:9px 12px;color:#ff8a80;font-size:13px;margin-bottom:12px}
.ms{background:rgba(46,204,113,.1);border:1px solid rgba(46,204,113,.3);border-radius:8px;
  padding:9px 12px;color:#80ffb0;font-size:13px;margin-bottom:12px}
.alink{text-align:center;margin-top:12px;font-size:12px;color:#8a9ab5}
.alink button{background:none;border:none;color:var(--gold);cursor:pointer;font-family:'Tajawal',sans-serif;font-size:12px;text-decoration:underline}

/* FIELDS */
.fg{margin-bottom:13px}
.fl{font-size:12px;color:var(--gray2);margin-bottom:5px;display:block;font-weight:500}
.fi{width:100%;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);
  border-radius:10px;padding:11px 13px;color:var(--white);font-family:'Tajawal',sans-serif;
  font-size:15px;outline:none;transition:border-color .15s;-webkit-appearance:none}
.fi:focus{border-color:var(--gold)}
.fi.ltr{direction:ltr;font-family:'IBM Plex Mono',monospace}
.fi::placeholder{color:var(--gray)}
.fi.ef{border-color:var(--err)!important}
.et{color:#ff8a80;font-size:11px;margin-top:2px;display:block}
textarea.fi{resize:none}
.light .fi{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.12);color:var(--white)}

/* BUTTONS */
.bp{width:100%;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#0a1628;
  border:none;border-radius:10px;padding:13px;font-family:'Tajawal',sans-serif;font-size:15px;
  font-weight:700;cursor:pointer;margin-top:6px}
.bp:disabled{opacity:.5}
.bs{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;
  padding:10px 20px;color:var(--gray2);font-family:'Tajawal',sans-serif;font-size:14px;cursor:pointer}
.bsv{background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:10px;
  padding:10px 26px;color:#0a1628;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;cursor:pointer}
.bsv:disabled{opacity:.5}
.add-btn{background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:10px;
  padding:10px 18px;color:#0a1628;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;
  cursor:pointer;display:flex;align-items:center;gap:6px}
.ib{background:none;border:1px solid rgba(255,255,255,.08);border-radius:7px;color:var(--gray);
  cursor:pointer;padding:6px 9px;font-size:13px}
.eb{background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:8px;
  padding:8px 13px;color:var(--gold);font-family:'Tajawal',sans-serif;font-size:12px;font-weight:600;cursor:pointer}

/* APP */
.app{display:flex;min-height:100vh;background:var(--bg);transition:background .25s}
.sidebar{width:225px;background:rgba(6,15,30,.99);border-left:1px solid var(--border);
  display:flex;flex-direction:column;padding:18px 13px;position:fixed;right:0;top:0;bottom:0;
  z-index:100;transition:transform .25s ease}
.light .sidebar{background:rgba(230,236,248,.99)}
.sl{display:flex;align-items:center;gap:9px;padding:0 5px 18px;border-bottom:1px solid var(--border);margin-bottom:18px}
.sl-i{width:36px;height:36px;background:linear-gradient(135deg,var(--gold),var(--gold2));
  border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
.sl-t h2{font-size:13px;font-weight:900;color:var(--white)}
.sl-t p{font-size:10px;color:var(--gray)}
.ni{display:flex;align-items:center;gap:9px;padding:10px 11px;border-radius:9px;cursor:pointer;
  color:var(--gray);font-size:13px;font-weight:500;margin-bottom:3px;border:none;background:none;
  width:100%;text-align:right;font-family:'Tajawal',sans-serif}
.ni.on{background:rgba(201,168,76,.12);color:var(--gold)}
.su{border-top:1px solid var(--border);padding-top:13px;display:flex;align-items:center;gap:7px;margin-top:auto;flex-wrap:wrap}
.su-a{width:32px;height:32px;background:var(--navy3);border:1px solid var(--border);
  border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--gold);flex-shrink:0}
.su-e{font-size:10px;color:var(--gray);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.lb{background:none;border:none;color:var(--gray);cursor:pointer;font-size:15px;padding:3px;flex-shrink:0}
.main{margin-right:225px;flex:1;padding:24px}
@media(max-width:768px){
  .sidebar{transform:translateX(110%)}
  .sidebar.open{transform:translateX(0)}
  .main{margin-right:0;padding:62px 13px 24px}
  .mh{display:flex!important}
  .hm{display:none!important}
  .stats{grid-template-columns:1fr 1fr!important}
}
.mh{display:none;position:fixed;top:0;left:0;right:0;background:rgba(6,15,30,.98);
  border-bottom:1px solid var(--border);padding:11px 15px;align-items:center;
  justify-content:space-between;z-index:200;backdrop-filter:blur(10px)}
.light .mh{background:rgba(230,236,248,.98)}
.mb{background:none;border:1px solid var(--border);border-radius:7px;color:var(--gold);
  cursor:pointer;font-size:17px;padding:4px 9px}
.ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99}
.ov.open{display:block}

/* STATS */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}
.sc{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:16px;position:relative;overflow:hidden}
.sc::before{content:'';position:absolute;top:0;right:0;width:55%;height:2px;background:linear-gradient(to left,var(--gold),transparent)}
.si{font-size:20px;margin-bottom:6px}
.sv{font-size:22px;font-weight:900;color:var(--gold);line-height:1}
.sl2{font-size:11px;color:var(--gray);margin-top:3px}
.ss{font-size:10px;color:var(--gray2);margin-top:5px}

/* PAGE */
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:9px}
.pt{font-size:19px;font-weight:900;color:var(--white)}
.pt span{color:var(--gold)}

/* FILTERS ROW */
.fr{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.sw{flex:1;min-width:160px;position:relative}
.sw input{padding-right:38px!important}
.si2{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--gray);pointer-events:none;font-size:15px}
.fs{background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);border-radius:10px;
  padding:10px 12px;color:var(--white);font-family:'Tajawal',sans-serif;font-size:13px;outline:none;cursor:pointer;-webkit-appearance:none}
.fs option{background:var(--navy2)}
.light .fs{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.12);color:var(--white)}

/* TABLE */
.tw{background:var(--card);border:1px solid var(--border);border-radius:13px;overflow-x:auto}
.tw table{width:100%;border-collapse:collapse}
.tw th{background:rgba(201,168,76,.05);padding:11px 13px;text-align:right;font-size:11px;font-weight:700;color:var(--gold);white-space:nowrap}
.tw td{padding:11px 13px;font-size:13px;color:var(--gray2);border-top:1px solid rgba(255,255,255,.04);vertical-align:middle}
.tw tr.sold-row td{opacity:.45}
.tw tr.sold-row td.nm::after{content:" · تم البيع";color:var(--sold);font-size:11px;font-weight:400}
.tw td.nm{color:var(--white);font-weight:600}
.tw td.mo{font-family:'IBM Plex Mono',monospace;font-size:11px;direction:ltr;text-align:left}
.tw td.am{color:var(--gold);font-weight:700}
.badge{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700}
.badge.ok{background:rgba(46,204,113,.1);color:var(--ok);border:1px solid rgba(46,204,113,.2)}
.badge.nd{background:rgba(243,156,18,.1);color:var(--warn);border:1px solid rgba(243,156,18,.2)}
.badge.sold{background:rgba(107,122,153,.1);color:var(--sold);border:1px solid rgba(107,122,153,.2)}
.ab{display:flex;gap:4px}
.emp{text-align:center;padding:45px 20px}
.ei{font-size:40px;margin-bottom:10px;opacity:.3}
.et2{font-size:13px;color:var(--gray)}

/* DRAWER */
.dov{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:300;
  display:flex;align-items:flex-end;justify-content:center}
@media(min-width:769px){
  .dov{align-items:center}
  .drawer{border-radius:18px!important;max-height:85vh!important;margin:20px}
}
.drawer{background:var(--navy2);border:1px solid var(--border);border-radius:18px 18px 0 0;
  width:100%;max-width:580px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden}
.light .drawer{background:#fff}
.dhead{padding:16px 20px 14px;border-bottom:1px solid var(--border);flex-shrink:0;
  display:flex;align-items:center;justify-content:space-between}
.dt{font-size:16px;font-weight:900;color:var(--white)}
.dc{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:7px;
  color:var(--gray);cursor:pointer;padding:5px 9px;font-size:15px}
.dbody{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 20px 8px}
.dfoot{padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;background:var(--navy2)}
.light .dfoot{background:#fff}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
@media(max-width:500px){.g2{grid-template-columns:1fr}}
.g2 .full{grid-column:1/-1}

/* DETAIL VIEW */
.dr2{display:flex;gap:7px;margin-bottom:8px;font-size:13px;align-items:flex-start}
.dl{color:var(--gray);min-width:140px;flex-shrink:0;font-size:12px;padding-top:1px}
.dv{color:var(--white);font-weight:500;word-break:break-all;font-size:13px}
.dv.mono{font-family:'IBM Plex Mono',monospace;direction:ltr;font-size:11px}

/* CHECKBOX */
.chk{display:flex;align-items:center;gap:8px;padding:3px 0}
.chk input{width:18px;height:18px;accent-color:var(--gold);cursor:pointer;flex-shrink:0}
.chk label{font-size:14px;color:var(--gray2);cursor:pointer}

/* LOGS */
.logs{display:flex;flex-direction:column;gap:7px}
.log{background:var(--card);border:1px solid var(--border);border-radius:9px;
  padding:11px 13px;display:flex;align-items:center;gap:11px}
.ld{width:6px;height:6px;border-radius:50%;background:var(--gold);flex-shrink:0}
.lt{flex:1;font-size:12px;color:var(--gray2)}
.lt strong{color:var(--white)}
.ldt{font-size:10px;color:var(--gray);font-family:'IBM Plex Mono',monospace;white-space:nowrap}

/* NOTIFICATION */
.notif{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
  background:var(--navy2);border:1px solid var(--border);border-radius:12px;
  padding:11px 18px;font-size:13px;color:var(--white);z-index:9999;
  box-shadow:0 8px 30px rgba(0,0,0,.5);display:flex;align-items:center;gap:8px;white-space:nowrap}
.notif.ok{border-color:rgba(46,204,113,.4)}
.notif.err{border-color:rgba(231,76,60,.4)}

/* MISC */
.spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(0,0,0,.15);
  border-top-color:#0a1628;border-radius:50%;animation:sp .6s linear infinite}
.spin2{border-top-color:var(--gold);border-color:rgba(255,255,255,.15)}
@keyframes sp{to{transform:rotate(360deg)}}
.syn{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--ok);
  background:rgba(46,204,113,.08);border:1px solid rgba(46,204,113,.2);border-radius:20px;padding:2px 9px}
`;

function fmt(ts) {
  if (!ts) return "—";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("ar-LY") + " " + d.toLocaleTimeString("ar-LY",{hour:"2-digit",minute:"2-digit"});
  } catch { return "—"; }
}

function exportCSV(clients) {
  const H = ["الاسم","المصرف","الهاتف1","الهاتف2","الرقم الوطني","رقم الحساب","IBAN","المبلغ","العملة","تم الشراء من طرف","نوع الحجز","حالة البطاقة","تاريخ الحجز","الرقم السري","بيعت إلى","تم البيع","ملاحظات"];
  const R = clients.map(c=>[c.name,c.bankType==="أخرى"?c.bankTypeOther||"أخرى":c.bankType,c.phone1,c.phone2||"",c.nationalId,c.accountNumber||"",c.iban||"",c.amount||"",c.currency,c.purchasedBy||"",c.paymentType||"",c.cardBooked?"تم الحجز":"لم يتم",c.bookingDate||"",c.pinCode||"",c.soldTo||"",c.isSold?"نعم":"لا",c.notes||""]);
  const csv=[H,...R].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
  a.download=`clients_${Date.now()}.csv`;a.click();
}

function Notif({n,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,3200);return()=>clearTimeout(t);},[]);
  return <div className={`notif ${n.type}`}>{n.type==="ok"?"✅":"❌"} {n.msg}</div>;
}

// ── ClientForm ──────────────────────────────────────────────
const ClientForm = memo(function ClientForm({init, onSave, submitRef}) {
  const [f, setF] = useState(() => init ? {...init} : {...EMPTY});
  const [e, setE] = useState({});
  const set = useCallback((k,v) => { setF(p=>({...p,[k]:v})); setE(p=>({...p,[k]:undefined})); }, []);

  const submit = useCallback(() => {
    const err={};
    if (!f.name.trim())       err.name="مطلوب";
    if (!f.bankType)          err.bankType="مطلوب";
    if (f.bankType==="أخرى"&&!f.bankTypeOther?.trim()) err.bankTypeOther="اكتب اسم المصرف";
    if (!f.phone1.trim())     err.phone1="مطلوب";
    if (!f.nationalId.trim()) err.nationalId="مطلوب";
    if (f.accountNumber&&!/^[A-Za-z0-9\s\-]+$/.test(f.accountNumber)) err.accountNumber="أحرف إنجليزية وأرقام فقط";
    if (f.iban&&!/^[A-Za-z0-9\s\-]+$/.test(f.iban)) err.iban="أحرف إنجليزية وأرقام فقط";
    if (Object.keys(err).length){setE(err);return;}
    onSave(f);
  }, [f, onSave]);

  if (submitRef) submitRef.current = submit;

  return (
    <div className="g2">
      {/* Name */}
      <div className="fg full">
        <label className="fl">الاسم الكامل *</label>
        <input className={`fi${e.name?" ef":""}`} placeholder="اسم العميل"
          value={f.name} onChange={ev=>set("name",ev.target.value)}
          autoComplete="off" autoCorrect="off" autoCapitalize="words"/>
        {e.name&&<span className="et">{e.name}</span>}
      </div>
      {/* Bank */}
      <div className="fg full">
        <label className="fl">نوع المصرف *</label>
        <select className={`fi${e.bankType?" ef":""}`} value={f.bankType} onChange={ev=>set("bankType",ev.target.value)}>
          <option value="">اختر المصرف</option>
          {BANKS.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        {e.bankType&&<span className="et">{e.bankType}</span>}
      </div>
      {/* Custom bank */}
      {f.bankType==="أخرى"&&(
        <div className="fg full">
          <label className="fl">اسم المصرف *</label>
          <input className={`fi${e.bankTypeOther?" ef":""}`} placeholder="اكتب اسم المصرف"
            value={f.bankTypeOther||""} onChange={ev=>set("bankTypeOther",ev.target.value)}/>
          {e.bankTypeOther&&<span className="et">{e.bankTypeOther}</span>}
        </div>
      )}
      {/* Phones */}
      <div className="fg">
        <label className="fl">رقم الهاتف 1 *</label>
        <input className={`fi${e.phone1?" ef":""}`} type="tel" placeholder="0912345678"
          value={f.phone1} onChange={ev=>set("phone1",ev.target.value)}/>
        {e.phone1&&<span className="et">{e.phone1}</span>}
      </div>
      <div className="fg">
        <label className="fl">رقم الهاتف 2</label>
        <input className="fi" type="tel" placeholder="اختياري"
          value={f.phone2} onChange={ev=>set("phone2",ev.target.value)}/>
      </div>
      {/* National ID */}
      <div className="fg full">
        <label className="fl">الرقم الوطني *</label>
        <input className={`fi${e.nationalId?" ef":""}`} placeholder="الرقم الوطني"
          value={f.nationalId} onChange={ev=>set("nationalId",ev.target.value)} inputMode="numeric"/>
        {e.nationalId&&<span className="et">{e.nationalId}</span>}
      </div>
      {/* Account & IBAN */}
      <div className="fg">
        <label className="fl">رقم الحساب المصرفي</label>
        <input className={`fi ltr${e.accountNumber?" ef":""}`} placeholder="ACC-123456789"
          value={f.accountNumber} autoCapitalize="characters" autoCorrect="off"
          onChange={ev=>set("accountNumber",ev.target.value.replace(/[^A-Za-z0-9\s\-]/g,""))}/>
        {e.accountNumber&&<span className="et">{e.accountNumber}</span>}
      </div>
      <div className="fg">
        <label className="fl">رقم IBAN</label>
        <input className={`fi ltr${e.iban?" ef":""}`} placeholder="LY83002000001016000012"
          value={f.iban} autoCapitalize="characters" autoCorrect="off"
          onChange={ev=>set("iban",ev.target.value.replace(/[^A-Za-z0-9\s\-]/g,"").toUpperCase())}/>
        {e.iban&&<span className="et">{e.iban}</span>}
      </div>
      {/* Amount */}
      <div className="fg full">
        <label className="fl">المبلغ المدفوع</label>
        <div style={{display:"flex",gap:7}}>
          <input className="fi" type="number" inputMode="decimal" placeholder="0.00"
            value={f.amount} onChange={ev=>set("amount",ev.target.value)} style={{flex:1}}/>
          <select className="fi" value={f.currency} onChange={ev=>set("currency",ev.target.value)} style={{width:100,flexShrink:0}}>
            <option value="د.ل">دينار ليبي</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>
      {/* Purchased by */}
      <div className="fg full">
        <label className="fl">تم الشراء من طرف</label>
        <input className="fi" placeholder="اسم الموظف / المسؤول"
          value={f.purchasedBy} onChange={ev=>set("purchasedBy",ev.target.value)}/>
      </div>
      {/* Payment type */}
      <div className="fg full">
        <label className="fl">نوع الحجز</label>
        <div style={{display:"flex",gap:8}}>
          {["كاش","حوالة","بطاقة"].map(t=>(
            <button key={t} type="button" onClick={()=>set("paymentType",t)}
              style={{flex:1,padding:"10px 6px",borderRadius:10,cursor:"pointer",
                fontFamily:"Tajawal,sans-serif",fontSize:14,fontWeight:700,
                border:f.paymentType===t?"2px solid var(--gold)":"1.5px solid rgba(255,255,255,.12)",
                background:f.paymentType===t?"rgba(201,168,76,.15)":"rgba(255,255,255,.05)",
                color:f.paymentType===t?"var(--gold)":"var(--gray2)",transition:"all .15s"}}>
              {t==="كاش"?"💵":t==="حوالة"?"🏦":"💳"} {t}
            </button>
          ))}
        </div>
      </div>
      {/* Card booked */}
      <div className="fg full">
        <div className="chk">
          <input type="checkbox" id="cb" checked={f.cardBooked}
            onChange={ev=>set("cardBooked",ev.target.checked)}/>
          <label htmlFor="cb">✅ تم حجز البطاقة</label>
        </div>
      </div>
      {f.cardBooked&&(
        <div className="fg full">
          <label className="fl">تاريخ الحجز</label>
          <input className="fi" type="date" value={f.bookingDate}
            onChange={ev=>set("bookingDate",ev.target.value)}/>
        </div>
      )}
      {/* Pin */}
      <div className="fg full">
        <label className="fl">الرقم السري للبطاقة</label>
        <input className="fi ltr" placeholder="مثال: 1234"
          value={f.pinCode} inputMode="numeric" maxLength={4}
          onChange={ev=>set("pinCode",ev.target.value.replace(/[^0-9]/g,"").slice(0,4))}
          style={{letterSpacing:6,fontSize:20,textAlign:"center"}}/>
      </div>
      {/* Sold */}
      <div className="fg full">
        <div className="chk">
          <input type="checkbox" id="isSold" checked={f.isSold||false}
            onChange={ev=>set("isSold",ev.target.checked)}/>
          <label htmlFor="isSold">🔴 تم بيع البطاقة</label>
        </div>
      </div>
      {f.isSold&&(
        <div className="fg full">
          <label className="fl">تم بيع البطاقة إلى طرف</label>
          <input className="fi" placeholder="اسم المشتري / الجهة"
            value={f.soldTo||""} onChange={ev=>set("soldTo",ev.target.value)}/>
        </div>
      )}
      {/* Notes */}
      <div className="fg full">
        <label className="fl">ملاحظات</label>
        <textarea className="fi" rows={3} placeholder="ملاحظات إضافية..."
          value={f.notes} onChange={ev=>set("notes",ev.target.value)}/>
      </div>
    </div>
  );
});

// ── ViewClient ───────────────────────────────────────────────
function ViewClient({c,onClose,onEdit}) {
  const bank = c.bankType==="أخرى" ? (c.bankTypeOther||"أخرى") : c.bankType;
  const rows=[
    ["الاسم",c.name],["المصرف",bank],["الهاتف 1",c.phone1],
    ["الهاتف 2",c.phone2||"—"],["الرقم الوطني",c.nationalId],
    ["رقم الحساب",c.accountNumber||"—",true],["رقم IBAN",c.iban||"—",true],
    ["المبلغ",c.amount?`${parseFloat(c.amount).toLocaleString()} ${c.currency}`:"—"],
    ["تم الشراء من طرف",c.purchasedBy||"—"],["نوع الحجز",c.paymentType||"—"],
    ["حالة البطاقة",c.cardBooked?"✅ تم الحجز":"⏳ لم يتم بعد"],
    ["تاريخ الحجز",c.bookingDate||"—"],["الرقم السري",c.pinCode||"—"],
    ["حالة البيع",c.isSold?"🔴 تم البيع":"🟢 لم يُباع"],
    ["بيعت إلى",c.soldTo||"—"],["ملاحظات",c.notes||"—"],
    ["تاريخ الإضافة",fmt(c.createdAt)],["أضيف بواسطة",c.createdBy||"—"],
    ["آخر تعديل",fmt(c.updatedAt)],
  ];
  return (
    <div className="dov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="drawer">
        <div className="dhead">
          <span className="dt">👤 {c.name}</span>
          <button className="dc" onClick={onClose}>✕</button>
        </div>
        <div className="dbody">
          {c.isSold&&<div style={{background:"rgba(231,76,60,.1)",border:"1px solid rgba(231,76,60,.3)",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:13,color:"#ff8a80"}}>🔴 تم بيع هذه البطاقة{c.soldTo?` إلى: ${c.soldTo}`:""}</div>}
          {rows.map(([l,v,mono])=>(
            <div key={l} className="dr2">
              <span className="dl">{l}</span>
              <span className={`dv${mono?" mono":""}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="dfoot">
          <button className="bs" onClick={onClose}>إغلاق</button>
          <button className="bsv" onClick={()=>{onClose();onEdit(c);}}>✏️ تعديل</button>
        </div>
      </div>
    </div>
  );
}

// ── AuthScreen ───────────────────────────────────────────────
function AuthScreen({onLogin}) {
  const [tab,setTab]=useState("login");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const [ok,setOk]=useState("");
  const [reset,setReset]=useState(false);
  const [load,setLoad]=useState(false);

  const handle=async()=>{
    setErr("");setOk("");setLoad(true);
    if(!email.trim()||!pass.trim()){setErr("يرجى ملء جميع الحقول");setLoad(false);return;}
    try{
      if(tab==="login"){const u=await signInWithEmailAndPassword(auth,email.trim(),pass);onLogin(u.user);}
      else{const u=await createUserWithEmailAndPassword(auth,email.trim(),pass);onLogin(u.user);}
    }catch(e){
      const m={"auth/invalid-credential":"البريد أو كلمة المرور غير صحيحة",
        "auth/email-already-in-use":"البريد مسجل مسبقاً","auth/weak-password":"كلمة المرور قصيرة (6+ أحرف)",
        "auth/invalid-email":"البريد غير صالح","auth/too-many-requests":"محاولات كثيرة، حاول لاحقاً"};
      setErr(m[e.code]||"حدث خطأ");
    }
    setLoad(false);
  };

  const handleReset=async()=>{
    setErr("");setOk("");setLoad(true);
    if(!email.trim()){setErr("أدخل بريدك");setLoad(false);return;}
    try{await sendPasswordResetEmail(auth,email.trim());setOk("تم الإرسال ✉️");setReset(false);}
    catch{setErr("البريد غير مسجل");}
    setLoad(false);
  };

  return(
    <div className="aw">
      <style>{CSS}</style>
      <div className="ac">
        <div className="al2">
          <div className="li">🏦</div>
          <h1>نظام إدارة العملاء المصرفيين</h1>
          <p>منصة آمنة ومتزامنة عبر جميع الأجهزة</p>
        </div>
        {!reset?(
          <>
            <div className="tabs">
              <button className={`tab${tab==="login"?" on":""}`} onClick={()=>{setTab("login");setErr("");}}>تسجيل الدخول</button>
              <button className={`tab${tab==="register"?" on":""}`} onClick={()=>{setTab("register");setErr("");}}>حساب جديد</button>
            </div>
            {err&&<div className="me">{err}</div>}
            {ok&&<div className="ms">{ok}</div>}
            <div className="fg">
              <label className="fl">البريد الإلكتروني</label>
              <input className="fi" type="email" inputMode="email" placeholder="example@mail.com"
                value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}
                autoCapitalize="none" autoCorrect="off" autoComplete="email"/>
            </div>
            <div className="fg">
              <label className="fl">كلمة المرور</label>
              <input className="fi" type="password" placeholder="••••••••"
                value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}
                autoComplete="current-password"/>
            </div>
            <button className="bp" onClick={handle} disabled={load}>
              {load?<span className="spin spin2"/>:(tab==="login"?"🔐 تسجيل الدخول":"✨ إنشاء حساب")}
            </button>
            {tab==="login"&&<div className="alink">نسيت كلمة المرور؟ <button onClick={()=>{setReset(true);setErr("");setOk("");}}>إعادة التعيين</button></div>}
          </>
        ):(
          <>
            <h3 style={{color:"var(--gold)",marginBottom:7}}>إعادة تعيين كلمة المرور</h3>
            <p style={{fontSize:12,color:"var(--gray)",marginBottom:16}}>سنرسل رابطاً لبريدك</p>
            {err&&<div className="me">{err}</div>}
            {ok&&<div className="ms">{ok}</div>}
            <div className="fg">
              <label className="fl">البريد الإلكتروني</label>
              <input className="fi" type="email" inputMode="email" placeholder="example@mail.com"
                value={email} onChange={e=>setEmail(e.target.value)} autoCapitalize="none"/>
            </div>
            <button className="bp" onClick={handleReset} disabled={load}>{load?<span className="spin spin2"/>:"📨 إرسال"}</button>
            <div className="alink"><button onClick={()=>{setReset(false);setErr("");}}>← العودة</button></div>
          </>
        )}
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(null);
  const [ready,setReady]=useState(false);
  const [clients,setClients]=useState([]);
  const [logs,setLogs]=useState([]);
  const [page,setPage]=useState("clients");
  const [modal,setModal]=useState(null);
  const [sel,setSel]=useState(null);
  const [notif,setNotif]=useState(null);
  const [bar,setBar]=useState(false);
  const [saving,setSaving]=useState(false);
  const [dark,setDark]=useState(true);
  const [search,setSearch]=useState("");
  const [filterStatus,setFilterStatus]=useState("all");
  const [filterBank,setFilterBank]=useState("all");
  const [synced,setSynced]=useState(false);
  const addRef = useRef(null);
  const editRef = useRef(null);

  const notify=useCallback((msg,type="ok")=>setNotif({msg,type}),[]);

  useEffect(()=>{ return onAuthStateChanged(auth,u=>{setUser(u);setReady(true);}); },[]);

  useEffect(()=>{
    if(!user){setClients([]);setLogs([]);setSynced(false);return;}
    const qc=query(collection(db,"clients"),where("uid","==",user.uid),orderBy("createdAt","desc"));
    const u1=onSnapshot(qc,snap=>{setClients(snap.docs.map(d=>({id:d.id,...d.data()})));setSynced(true);},err=>console.error(err));
    const ql=query(collection(db,"logs"),where("uid","==",user.uid),orderBy("time","desc"));
    const u2=onSnapshot(ql,snap=>setLogs(snap.docs.map(d=>({id:d.id,...d.data()}))),err=>console.error(err));
    return()=>{u1();u2();};
  },[user]);

  const addLog=useCallback((action,name)=>
    addDoc(collection(db,"logs"),{uid:user.uid,action,client:name,by:user.email,time:serverTimestamp()})
  ,[user]);

  const handleAdd=useCallback(async(form)=>{
    setSaving(true);
    try{
      await addDoc(collection(db,"clients"),{...form,uid:user.uid,createdBy:user.email,createdAt:serverTimestamp(),updatedAt:null,updatedBy:null});
      await addLog("إضافة عميل",form.name);
      setModal(null);notify("تم إضافة العميل ✅");
    }catch(e){notify("خطأ: "+e.message,"err");}
    setSaving(false);
  },[user,addLog,notify]);

  const handleEdit=useCallback(async(form)=>{
    setSaving(true);
    try{
      await updateDoc(doc(db,"clients",sel.id),{...form,updatedBy:user.email,updatedAt:serverTimestamp()});
      await addLog("تعديل عميل",form.name);
      setModal(null);notify("تم التعديل ✏️");
    }catch(e){notify("خطأ: "+e.message,"err");}
    setSaving(false);
  },[user,sel,addLog,notify]);

  const handleDelete=useCallback(async()=>{
    setSaving(true);
    try{
      await deleteDoc(doc(db,"clients",sel.id));
      await addLog("حذف عميل",sel.name);
      setModal(null);notify("تم الحذف 🗑","err");
    }catch(e){notify("خطأ: "+e.message,"err");}
    setSaving(false);
  },[user,sel,addLog,notify]);

  // Filter & search
  const filtered=clients.filter(c=>{
    const q=search.toLowerCase().trim();
    const m=!q||c.name?.toLowerCase().includes(q)||c.phone1?.includes(q)||c.phone2?.includes(q);
    const bank=c.bankType==="أخرى"?c.bankTypeOther||"أخرى":c.bankType;
    const fb=filterBank==="all"||bank===filterBank||c.bankType===filterBank;
    const fs=filterStatus==="all"
      ||(filterStatus==="booked"&&c.cardBooked&&!c.isSold)
      ||(filterStatus==="pending"&&!c.cardBooked&&!c.isSold)
      ||(filterStatus==="sold"&&c.isSold);
    return m&&fb&&fs;
  });

  const total=clients.length;
  const booked=clients.filter(c=>c.cardBooked&&!c.isSold).length;
  const pending=clients.filter(c=>!c.cardBooked&&!c.isSold).length;
  const sold=clients.filter(c=>c.isSold).length;
  // Exclude sold clients from total amount
  const totalAmt=clients.filter(c=>!c.isSold).reduce((s,c)=>s+(parseFloat(c.amount)||0),0);

  const bankNames=[...new Set(clients.map(c=>c.bankType==="أخرى"?c.bankTypeOther||"أخرى":c.bankType).filter(Boolean))];

  const nav=[
    {k:"dashboard",i:"📊",l:"لوحة الإحصائيات"},
    {k:"clients",  i:"👥",l:"العملاء"},
    {k:"logs",     i:"📜",l:"سجل النشاط"},
  ];

  if(!ready)return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0a1628"}}>
      <style>{CSS}</style><span className="spin spin2" style={{width:36,height:36,borderWidth:3}}/>
    </div>
  );
  if(!user)return <AuthScreen onLogin={u=>setUser(u)}/>;

  return(
    <div className={`app ${dark?"dark":"light"}`}>
      <style>{CSS}</style>

      {/* Mobile top bar */}
      <div className="mh">
        <button className="mb" onClick={()=>setBar(o=>!o)}>☰</button>
        <span style={{color:"var(--gold)",fontWeight:700,fontSize:14}}>🏦 إدارة العملاء</span>
        <button className="mb" onClick={()=>{setSel(null);setModal("add");setBar(false);}}>＋</button>
      </div>
      {bar&&<div className="ov open" onClick={()=>setBar(false)}/>}

      {/* Sidebar */}
      <div className={`sidebar${bar?" open":""}`}>
        <div className="sl">
          <div className="sl-i">🏦</div>
          <div className="sl-t"><h2>بنك البيانات</h2><p>إدارة العملاء</p></div>
        </div>
        <nav>{nav.map(n=>(
          <button key={n.k} className={`ni${page===n.k?" on":""}`} onClick={()=>{setPage(n.k);setBar(false);}}>
            <span>{n.i}</span>{n.l}
          </button>
        ))}</nav>
        <div className="su">
          <div className="su-a">{user.email[0].toUpperCase()}</div>
          <div className="su-e">{user.email}</div>
          <button className="lb" onClick={()=>setDark(d=>!d)} title="تغيير المظهر">{dark?"☀️":"🌙"}</button>
          <button className="lb" onClick={()=>signOut(auth)} title="خروج">⎋</button>
        </div>
      </div>

      {/* Main */}
      <main className="main">

        {/* DASHBOARD */}
        {page==="dashboard"&&(
          <>
            <div className="ph">
              <h1 className="pt">لوحة <span>الإحصائيات</span></h1>
              {synced&&<span className="syn">🔄 متزامن</span>}
            </div>
            <div className="stats">
              {[
                {i:"👥",v:total,l:"إجمالي العملاء",s:"عميل مسجل"},
                {i:"✅",v:booked,l:"تم حجز البطاقة",s:`${total?Math.round(booked/total*100):0}%`,c:"var(--ok)"},
                {i:"⏳",v:pending,l:"لم يتم الحجز",s:"بانتظار المعالجة",c:"var(--warn)"},
                {i:"🔴",v:sold,l:"تم البيع",s:"بطاقة مباعة",c:"var(--err)"},
                {i:"💰",v:totalAmt.toLocaleString("ar-LY"),l:"إجمالي المبالغ",s:"بعد خصم المباعة",c:"var(--gold)"},
              ].map((s,i)=>(
                <div key={i} className="sc">
                  <div className="si">{s.i}</div>
                  <div className="sv" style={s.c?{color:s.c}:{}}>{s.v}</div>
                  <div className="sl2">{s.l}</div>
                  <div className="ss">{s.s}</div>
                </div>
              ))}
            </div>
            <h3 style={{color:"var(--gold)",marginBottom:12,fontSize:13}}>آخر النشاطات</h3>
            <div className="logs">
              {logs.slice(0,7).map(l=>(
                <div key={l.id} className="log">
                  <div className="ld"/><div className="lt"><strong>{l.action}</strong> — {l.client}</div>
                  <div className="ldt">{fmt(l.time)}</div>
                </div>
              ))}
              {!logs.length&&<div className="emp"><div className="ei">📜</div><div className="et2">لا يوجد نشاط بعد</div></div>}
            </div>
          </>
        )}

        {/* CLIENTS */}
        {page==="clients"&&(
          <>
            <div className="ph">
              <h1 className="pt">قائمة <span>العملاء</span></h1>
              <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                {synced&&<span className="syn">🔄 متزامن</span>}
                <button className="eb" onClick={()=>exportCSV(clients)}>📤 CSV</button>
                <button className="add-btn" onClick={()=>{setSel(null);setModal("add");}}>＋ إضافة</button>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="fr">
              <div className="sw" style={{minWidth:180,flex:2}}>
                <span className="si2">🔍</span>
                <input className="fi" placeholder="بحث بالاسم أو رقم الجوال..."
                  value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <select className="fs" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                <option value="all">الكل ({total})</option>
                <option value="booked">✅ تم الحجز ({booked})</option>
                <option value="pending">⏳ لم يتم ({pending})</option>
                <option value="sold">🔴 تم البيع ({sold})</option>
              </select>
              <select className="fs" value={filterBank} onChange={e=>setFilterBank(e.target.value)}>
                <option value="all">كل المصارف</option>
                {bankNames.map(b=><option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="tw">
              {filtered.length===0
                ?<div className="emp"><div className="ei">📋</div><div className="et2">{!clients.length?"اضغط + لإضافة أول عميل":"لا توجد نتائج"}</div></div>
                :<table>
                  <thead><tr>
                    <th>الاسم</th>
                    <th className="hm">المصرف</th>
                    <th className="hm">المبلغ</th>
                    <th>البطاقة</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(c=>{
                      const bank=c.bankType==="أخرى"?c.bankTypeOther||"أخرى":c.bankType;
                      return(
                        <tr key={c.id} className={c.isSold?"sold-row":""}>
                          <td className="nm">{c.name}</td>
                          <td className="hm" style={{fontSize:12}}>{bank}</td>
                          <td className="am hm">{c.amount?`${parseFloat(c.amount).toLocaleString()} ${c.currency}`:"—"}</td>
                          <td>
                            {c.isSold
                              ?<span className="badge sold">🔴 تم البيع</span>
                              :c.cardBooked
                                ?<span className="badge ok">✅ تم</span>
                                :<span className="badge nd">⏳ لم يتم</span>
                            }
                          </td>
                          <td><div className="ab">
                            <button className="ib" onClick={()=>{setSel(c);setModal("view");}}>👁</button>
                            <button className="ib" onClick={()=>{setSel(c);setModal("edit");}}>✏️</button>
                            <button className="ib" onClick={()=>{setSel(c);setModal("del");}}>🗑</button>
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              }
            </div>
            <div style={{marginTop:7,fontSize:11,color:"var(--gray)"}}>{filtered.length} عميل</div>
          </>
        )}

        {/* LOGS */}
        {page==="logs"&&(
          <>
            <div className="ph"><h1 className="pt">سجل <span>النشاط</span></h1></div>
            <div className="logs">
              {logs.map(l=>(
                <div key={l.id} className="log">
                  <div className="ld"/><div className="lt"><strong>{l.action}</strong> — {l.client} <span style={{color:"var(--gray)",fontSize:10}}>({l.by})</span></div>
                  <div className="ldt">{fmt(l.time)}</div>
                </div>
              ))}
              {!logs.length&&<div className="emp"><div className="ei">📜</div><div className="et2">لا يوجد سجل</div></div>}
            </div>
          </>
        )}
      </main>

      {/* ADD */}
      {modal==="add"&&(
        <div className="dov" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="drawer">
            <div className="dhead">
              <span className="dt">➕ إضافة عميل جديد</span>
              <button className="dc" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="dbody">
              <ClientForm onSave={handleAdd} submitRef={addRef}/>
            </div>
            <div className="dfoot">
              <button className="bs" onClick={()=>setModal(null)}>إلغاء</button>
              <button className="bsv" onClick={()=>addRef.current&&addRef.current()} disabled={saving}>
                {saving?<span className="spin"/>:"💾 حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT */}
      {modal==="edit"&&sel&&(
        <div className="dov" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="drawer">
            <div className="dhead">
              <span className="dt">✏️ تعديل بيانات العميل</span>
              <button className="dc" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="dbody">
              <ClientForm init={sel} onSave={handleEdit} submitRef={editRef}/>
            </div>
            <div className="dfoot">
              <button className="bs" onClick={()=>setModal(null)}>إلغاء</button>
              <button className="bsv" onClick={()=>editRef.current&&editRef.current()} disabled={saving}>
                {saving?<span className="spin"/>:"💾 حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW */}
      {modal==="view"&&sel&&(
        <ViewClient c={sel} onClose={()=>setModal(null)} onEdit={c=>{setSel(c);setModal("edit");}}/>
      )}

      {/* DELETE */}
      {modal==="del"&&sel&&(
        <div className="dov" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="drawer" style={{maxHeight:280}}>
            <div className="dhead">
              <span className="dt">🗑 تأكيد الحذف</span>
              <button className="dc" onClick={()=>setModal(null)}>✕</button>
            </div>
            <div className="dbody">
              <p style={{color:"var(--gray2)",lineHeight:1.8}}>
                هل أنت متأكد من حذف <strong style={{color:"var(--white)"}}>{sel.name}</strong>؟<br/>
                <span style={{color:"var(--err)",fontSize:12}}>لا يمكن التراجع عن هذا الإجراء.</span>
              </p>
            </div>
            <div className="dfoot">
              <button className="bs" onClick={()=>setModal(null)}>إلغاء</button>
              <button style={{background:"var(--err)",border:"none",borderRadius:10,padding:"10px 24px",
                color:"#fff",fontFamily:"Tajawal,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}}
                onClick={handleDelete} disabled={saving}>
                {saving?<span className="spin"/>:"حذف نهائياً"}
              </button>
            </div>
          </div>
        </div>
      )}

      {notif&&<Notif n={notif} onClose={()=>setNotif(null)}/>}
    </div>
  );
}
