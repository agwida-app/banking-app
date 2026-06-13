// src/App.js
import { useState, useEffect, useCallback, memo, useRef } from "react";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection, addDoc, updateDoc, deleteDoc, getDoc, setDoc,
  doc, query, where, orderBy, serverTimestamp, onSnapshot
} from "firebase/firestore";
import { auth, db } from "./firebase";

const ADMIN_UID = "yel5HGeqTfXRUmraIzfZK4XVhrS2";
const ADMIN_SECRET_TOKEN = "sk_live_agwida_2026";

const Logo = ({size=40}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={size} height={size}>
    <defs>
      <linearGradient id="lbg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0a1628"/>
        <stop offset="100%" stopColor="#162d52"/>
      </linearGradient>
      <linearGradient id="lc1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1a3a6b"/>
        <stop offset="100%" stopColor="#0f2040"/>
      </linearGradient>
      <linearGradient id="lc2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c9a84c"/>
        <stop offset="100%" stopColor="#e8c96a"/>
      </linearGradient>
      <linearGradient id="lgold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c9a84c"/>
        <stop offset="100%" stopColor="#f0d980"/>
      </linearGradient>
      <filter id="lsh"><feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgba(0,0,0,0.5)"/></filter>
    </defs>
    <circle cx="100" cy="100" r="96" fill="url(#lbg)" filter="url(#lsh)"/>
    <circle cx="100" cy="100" r="96" fill="none" stroke="#c9a84c" strokeWidth="1.5" opacity="0.4"/>
    <g transform="translate(100,105) rotate(-8) translate(-65,-41)">
      <rect x="0" y="0" width="130" height="82" rx="10" ry="10" fill="url(#lc1)" filter="url(#lsh)"/>
      <rect x="14" y="22" width="22" height="17" rx="3" fill="#c9a84c" opacity="0.7"/>
      <circle cx="88" cy="58" r="9" fill="#c9a84c" opacity="0.5"/>
      <circle cx="104" cy="58" r="9" fill="#e8c96a" opacity="0.7"/>
    </g>
    <g transform="translate(100,100) rotate(5) translate(-65,-41)">
      <rect x="0" y="0" width="130" height="82" rx="10" ry="10" fill="url(#lc2)" filter="url(#lsh)"/>
      <rect x="14" y="20" width="22" height="17" rx="3" fill="#0a1628" opacity="0.6"/>
      <circle cx="20" cy="52" r="2.5" fill="#0a1628" opacity="0.5"/>
      <circle cx="27" cy="52" r="2.5" fill="#0a1628" opacity="0.5"/>
      <circle cx="34" cy="52" r="2.5" fill="#0a1628" opacity="0.5"/>
      <circle cx="41" cy="52" r="2.5" fill="#0a1628" opacity="0.5"/>
      <circle cx="54" cy="52" r="2.5" fill="#0a1628" opacity="0.5"/>
      <circle cx="61" cy="52" r="2.5" fill="#0a1628" opacity="0.5"/>
    </g>
    <text x="100" y="115" fontFamily="Georgia,serif" fontSize="62" fontWeight="bold"
      textAnchor="middle" fill="url(#lgold)" opacity="0.95">G</text>
  </svg>
);

const BANKS = [
  "مصرف الجمهورية","مصرف الوحدة","المصرف التجاري الوطني",
  "مصرف التجارة والتنمية","مصرف الصحارى","مصرف شمال أفريقيا",
  "مصرف الأمان","مصرف اليقين","مصرف السراي","مصرف التضامن",
  "مصرف الواحة","مصرف النوران","مصرف المتوسط","مصرف الاتحاد",
  "مصرف الاندلس","مصرف آخر"
];

const PLANS = [
  { id:"1m",  label:"شهر",     months:1,  price:10  },
  { id:"3m",  label:"3 أشهر",  months:3,  price:30  },
  { id:"6m",  label:"6 أشهر",  months:6,  price:60  },
  { id:"12m", label:"12 شهر",  months:12, price:100 },
];
const COMMISSION_PCT = 10;

const EMPTY = {
  name:"",bankType:"",bankTypeOther:"",phone1:"",phone2:"",nationalId:"",passportId:"",
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
  --bg:#f0f4fa;--navy2:#ffffff;--navy3:#e8eef8;
  --gold:#9a6f00;--gold2:#b8860b;
  --white:#111827;--gray:#4b5563;--gray2:#1f2937;
  --ok:#166534;--err:#991b1b;--warn:#92400e;--sold:#6b7280;
  --border:rgba(154,111,0,0.2);--card:rgba(0,0,0,0.04);
}
html,body,#root{font-family:'Tajawal',sans-serif;direction:rtl;min-height:100%}
body{background:var(--bg);color:var(--white);min-height:100vh;transition:background .25s,color .25s}
.aw{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:linear-gradient(135deg,#050d1a,#0a1628,#0d1f3c)}
.ac{background:rgba(15,32,64,.97);border:1px solid var(--border);border-radius:20px;padding:36px 28px;width:100%;max-width:420px;box-shadow:0 8px 40px rgba(0,0,0,.5)}
.al2{text-align:center;margin-bottom:24px}
.li{width:60px;height:60px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px;overflow:hidden}
.al2 h1{font-size:17px;font-weight:900;color:#f8f6f0}
.al2 p{font-size:11px;color:#8a9ab5;margin-top:2px}
.tabs{display:flex;background:rgba(0,0,0,.25);border-radius:10px;padding:3px;margin-bottom:20px}
.tab{flex:1;padding:9px;border:none;background:none;color:#8a9ab5;cursor:pointer;border-radius:7px;font-family:'Tajawal',sans-serif;font-size:14px;transition:all .2s}
.tab.on{background:var(--gold);color:#0a1628;font-weight:700}
.me{background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);border-radius:8px;padding:9px 12px;color:#ff8a80;font-size:13px;margin-bottom:12px}
.ms{background:rgba(46,204,113,.1);border:1px solid rgba(46,204,113,.3);border-radius:8px;padding:9px 12px;color:#80ffb0;font-size:13px;margin-bottom:12px}
.mw{background:rgba(243,156,18,.1);border:1px solid rgba(243,156,18,.3);border-radius:10px;padding:9px 14px;color:#ffd080;font-size:13px;margin-bottom:16px}
.alink{text-align:center;margin-top:12px;font-size:12px;color:#8a9ab5}
.alink button{background:none;border:none;color:var(--gold);cursor:pointer;font-family:'Tajawal',sans-serif;font-size:12px;text-decoration:underline}
.sub-expired{background:rgba(231,76,60,.08);border:1px solid rgba(231,76,60,.25);border-radius:10px;padding:10px 14px;margin-bottom:16px;display:flex;align-items:center;gap:10px;font-size:13px;color:#ff8a80}
.sub-ok{background:rgba(46,204,113,.06);border:1px solid rgba(46,204,113,.2);border-radius:10px;padding:4px 12px;display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--ok)}
.readonly-badge{background:rgba(231,76,60,.1);color:#ff8a80;border:1px solid rgba(231,76,60,.3);border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700}
.limit-bar{background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:var(--gray2)}
.limit-progress{height:6px;background:rgba(255,255,255,.1);border-radius:3px;margin-top:6px;overflow:hidden}
.limit-fill{height:100%;background:linear-gradient(to left,var(--gold),var(--gold2));border-radius:3px;transition:width .3s}
.limit-fill.danger{background:linear-gradient(to left,var(--err),#ff6b6b)}
.act-box{background:rgba(201,168,76,.06);border:1px solid var(--border);border-radius:14px;padding:20px;margin-top:16px}
.act-box h3{font-size:15px;font-weight:900;color:var(--gold);margin-bottom:8px}
.act-box p{font-size:12px;color:var(--gray2);margin-bottom:14px;line-height:1.7}
.code-input{width:100%;background:rgba(255,255,255,.08);border:2px solid var(--border);border-radius:12px;padding:14px;color:var(--white);font-family:'IBM Plex Mono',monospace;font-size:18px;outline:none;text-align:center;letter-spacing:4px;text-transform:uppercase}
.code-input:focus{border-color:var(--gold)}
.admin-wrap{width:100%;max-width:700px;margin:0 auto;padding:20px}
.sub-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px 18px;margin-bottom:12px;transition:border-color .2s}
.sub-card:hover{border-color:rgba(201,168,76,.35)}
.sub-card-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:8px}
.sub-code{font-family:'IBM Plex Mono',monospace;font-size:16px;color:var(--gold);font-weight:700;letter-spacing:2px}
.sub-meta{font-size:12px;color:var(--gray2);margin-top:8px;line-height:2}
.status-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:700}
.chip-ok{background:rgba(46,204,113,.12);color:var(--ok);border:1px solid rgba(46,204,113,.25)}
.chip-exp{background:rgba(231,76,60,.12);color:var(--err);border:1px solid rgba(231,76,60,.25)}
.chip-free{background:rgba(201,168,76,.12);color:var(--gold);border:1px solid rgba(201,168,76,.25)}
.admin-action-row{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;padding-top:10px;border-top:1px solid rgba(255,255,255,.05)}
.ab-btn{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:var(--gray2);cursor:pointer;padding:6px 11px;font-size:12px;font-family:'Tajawal',sans-serif;display:inline-flex;align-items:center;gap:4px;transition:all .15s}
.ab-btn:hover{background:rgba(255,255,255,.1);color:var(--white)}
.ab-btn.green{color:var(--ok);border-color:rgba(46,204,113,.2)}
.ab-btn.gold{color:var(--gold);border-color:rgba(201,168,76,.3)}
.ab-btn.red{color:var(--err);border-color:rgba(231,76,60,.2)}
.plan-btn{flex:1;padding:10px 6px;border-radius:10px;cursor:pointer;border:1.5px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:var(--gray2);font-family:'Tajawal',sans-serif;font-size:13px;font-weight:700;transition:all .15s;text-align:center}
.plan-btn.on{border:2px solid var(--gold);background:rgba(201,168,76,.12);color:var(--gold)}
.fg{margin-bottom:13px}
.fl{font-size:12px;color:var(--gray2);margin-bottom:5px;display:block;font-weight:500}
.fi{width:100%;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:10px;padding:11px 13px;color:var(--white);font-family:'Tajawal',sans-serif;font-size:15px;outline:none;transition:border-color .15s;-webkit-appearance:none}
.fi:focus{border-color:var(--gold)}
.fi.ltr{direction:ltr;font-family:'IBM Plex Mono',monospace}
.fi::placeholder{color:var(--gray)}
.fi.ef{border-color:var(--err)!important}
.et{color:#ff8a80;font-size:11px;margin-top:2px;display:block}
textarea.fi{resize:none}
.light .fi{background:#fff;border-color:rgba(0,0,0,.18);color:var(--white);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.bp{width:100%;background:linear-gradient(135deg,var(--gold),var(--gold2));color:#0a1628;border:none;border-radius:10px;padding:13px;font-family:'Tajawal',sans-serif;font-size:15px;font-weight:700;cursor:pointer;margin-top:6px}
.bp:disabled{opacity:.5}
.bs{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 20px;color:var(--gray2);font-family:'Tajawal',sans-serif;font-size:14px;cursor:pointer}
.bsv{background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:10px;padding:10px 26px;color:#0a1628;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;cursor:pointer}
.bsv:disabled{opacity:.5}
.add-btn{background:linear-gradient(135deg,var(--gold),var(--gold2));border:none;border-radius:10px;padding:10px 18px;color:#0a1628;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px}
.ib{background:none;border:1px solid rgba(255,255,255,.08);border-radius:7px;color:var(--gray);cursor:pointer;padding:6px 9px;font-size:13px}
.eb{background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:8px;padding:8px 13px;color:var(--gold);font-family:'Tajawal',sans-serif;font-size:12px;font-weight:600;cursor:pointer}
.app{display:flex;min-height:100vh;background:var(--bg);transition:background .25s}
.sidebar{width:225px;background:rgba(6,15,30,.99);border-left:1px solid var(--border);display:flex;flex-direction:column;padding:18px 13px;position:fixed;right:0;top:0;bottom:0;z-index:100;transition:transform .25s ease}
.light .sidebar{background:#ffffff;border-left:1px solid #d1dae8;box-shadow:2px 0 12px rgba(0,0,0,.08)}
.sl{display:flex;align-items:center;gap:9px;padding:0 5px 18px;border-bottom:1px solid var(--border);margin-bottom:18px}
.sl-i{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;overflow:hidden}
.sl-t h2{font-size:13px;font-weight:900;color:var(--white)}
.sl-t p{font-size:10px;color:var(--gray)}
.ni{display:flex;align-items:center;gap:9px;padding:10px 11px;border-radius:9px;cursor:pointer;color:var(--gray);font-size:13px;font-weight:500;margin-bottom:3px;border:none;background:none;width:100%;text-align:right;font-family:'Tajawal',sans-serif}
.ni.on{background:rgba(201,168,76,.12);color:var(--gold)}
.su{border-top:1px solid var(--border);padding-top:13px;display:flex;align-items:center;gap:7px;margin-top:auto;flex-wrap:wrap}
.su-a{width:32px;height:32px;background:var(--navy3);border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--gold);flex-shrink:0}
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
.mh{display:none;position:fixed;top:0;left:0;right:0;background:rgba(6,15,30,.98);border-bottom:1px solid var(--border);padding:11px 15px;align-items:center;justify-content:space-between;z-index:200;backdrop-filter:blur(10px)}
.light .mh{background:rgba(255,255,255,.97);border-bottom:1px solid #d1dae8;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.mb{background:none;border:1px solid var(--border);border-radius:7px;color:var(--gold);cursor:pointer;font-size:17px;padding:4px 9px}
.ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:99}
.ov.open{display:block}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:11px;margin-bottom:20px}
.sc{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:15px;position:relative;overflow:hidden}
.sc::before{content:'';position:absolute;top:0;right:0;width:55%;height:2px;background:linear-gradient(to left,var(--gold),transparent)}
.si{font-size:20px;margin-bottom:6px}
.sv{font-size:21px;font-weight:900;color:var(--gold);line-height:1}
.sl2{font-size:11px;color:var(--gray);margin-top:3px}
.ss{font-size:10px;color:var(--gray2);margin-top:5px}
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:9px}
.pt{font-size:19px;font-weight:900;color:var(--white)}
.pt span{color:var(--gold)}
.fr{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.sw{flex:1;min-width:160px;position:relative}
.sw input{padding-right:38px!important}
.si2{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--gray);pointer-events:none;font-size:15px}
.fs{background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;color:var(--white);font-family:'Tajawal',sans-serif;font-size:13px;outline:none;cursor:pointer;-webkit-appearance:none}
.fs option{background:var(--navy2)}
.light .fs{background:#fff;border-color:rgba(0,0,0,.18);color:var(--white);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.tw{background:var(--card);border:1px solid var(--border);border-radius:13px;overflow-x:auto}
.tw table{width:100%;border-collapse:collapse}
.tw th{background:rgba(201,168,76,.05);padding:11px 13px;text-align:right;font-size:11px;font-weight:700;color:var(--gold);white-space:nowrap}
.tw td{padding:11px 13px;font-size:13px;color:var(--gray2);border-top:1px solid rgba(255,255,255,.04);vertical-align:middle}
.tw tr.sold-row td{opacity:.42}
.tw tr.sold-row td.nm::after{content:" · تم البيع";color:var(--sold);font-size:11px}
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
.dov{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:300;display:flex;align-items:flex-end;justify-content:center}
@media(min-width:769px){.dov{align-items:center}.drawer{border-radius:18px!important;max-height:85vh!important;margin:20px}}
.drawer{background:var(--navy2);border:1px solid var(--border);border-radius:18px 18px 0 0;width:100%;max-width:580px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden}
.light .drawer{background:#fff}
.dhead{padding:16px 20px 14px;border-bottom:1px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:space-between}
.dt{font-size:16px;font-weight:900;color:var(--white)}
.dc{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:7px;color:var(--gray);cursor:pointer;padding:5px 9px;font-size:15px}
.dbody{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 20px 8px}
.dfoot{padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;background:var(--navy2)}
.light .dfoot{background:#fff}
.light .tw{background:#fff;border-color:#d1dae8;box-shadow:0 2px 8px rgba(0,0,0,.07)}
.light .tw th{background:#f0f5ff;color:var(--gold);border-bottom:2px solid #d1dae8}
.light .tw td{color:#1f2937;border-top-color:#e8eef8}
.light .tw td.nm{color:#111827}
.light .sc{background:#fff;border-color:#d1dae8;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.light .sub-card{background:#fff;border-color:#d1dae8;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.light .ni{color:#374151}
.light .ni.on{background:rgba(154,111,0,.1);color:var(--gold)}
.light .bs{background:#f0f4fa;border-color:#d1dae8;color:#111827}
.light .ib{border-color:#d1dae8;color:#374151}
.light .eb{background:#f8faff;border-color:#d1dae8}
.light .dc{background:#f0f4fa;border-color:#d1dae8;color:#374151}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
@media(max-width:500px){.g2{grid-template-columns:1fr}}
.g2 .full{grid-column:1/-1}
.dr2{display:flex;gap:7px;margin-bottom:8px;font-size:13px;align-items:flex-start}
.dl{color:var(--gray);min-width:140px;flex-shrink:0;font-size:12px;padding-top:1px}
.dv{color:var(--white);font-weight:500;word-break:break-all;font-size:13px}
.dv.mono{font-family:'IBM Plex Mono',monospace;direction:ltr;font-size:11px}
.chk{display:flex;align-items:center;gap:8px;padding:3px 0}
.chk input{width:18px;height:18px;accent-color:var(--gold);cursor:pointer;flex-shrink:0}
.chk label{font-size:14px;color:var(--gray2);cursor:pointer}
.notif{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--navy2);border:1px solid var(--border);border-radius:12px;padding:11px 18px;font-size:13px;color:var(--white);z-index:9999;box-shadow:0 8px 30px rgba(0,0,0,.5);display:flex;align-items:center;gap:8px;white-space:nowrap}
.notif.ok{border-color:rgba(46,204,113,.4)}
.notif.err{border-color:rgba(231,76,60,.4)}
.spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(0,0,0,.15);border-top-color:#0a1628;border-radius:50%;animation:sp .6s linear infinite}
.spin2{border-top-color:var(--gold);border-color:rgba(255,255,255,.15)}
@keyframes sp{to{transform:rotate(360deg)}}
.syn{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--ok);background:rgba(46,204,113,.08);border:1px solid rgba(46,204,113,.2);border-radius:20px;padding:2px 9px}
@media print{body{background:#fff!important;color:#000!important}}
`;

function fmt(ts) {
  if (!ts) return "—";
  try { const d=ts.toDate?ts.toDate():new Date(ts); return d.toLocaleDateString("ar-LY"); }
  catch { return "—"; }
}
function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  const exp = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
  return Math.ceil((exp - new Date()) / (1000*60*60*24));
}
function addMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

function generatePDF(clients, single = null) {
  const list = single ? [single] : clients;
  const date = new Date().toLocaleDateString("ar-LY");
  const title = single ? `بيانات العميل: ${single.name}` : "تقرير قائمة العملاء";
  const rows = list.map((c,i) => {
    const bank = c.bankType==="مصرف آخر" ? (c.bankTypeOther||"مصرف آخر") : c.bankType;
    const status = c.isSold ? "مباع" : c.cardBooked ? "تم الحجز" : "لم يتم";
    const sc = c.isSold ? "#c0392b" : c.cardBooked ? "#166534" : "#92400e";
    const sb = c.isSold ? "#fef2f2" : c.cardBooked ? "#f0fdf4" : "#fffbeb";
    return `<tr>
      <td style="text-align:center;color:#9ca3af;font-size:10px">${i+1}</td>
      <td style="font-weight:700;color:#111827">${c.name||"—"}</td>
      <td>${bank||"—"}</td>
      <td style="font-family:monospace;direction:ltr">${c.phone1||"—"}</td>
      <td style="font-family:monospace;direction:ltr;font-size:10px">${c.nationalId||"—"}</td>
      <td style="font-weight:700;color:#92400e">${c.amount?parseFloat(c.amount).toLocaleString()+" "+c.currency:"—"}</td>
      <td>${c.paymentType||"—"}</td>
      <td><span style="background:${sb};color:${sc};border:1px solid ${sc}33;border-radius:4px;padding:2px 7px;font-size:10px;font-weight:700;white-space:nowrap">${status}</span></td>
      <td style="font-family:monospace;direction:ltr;font-weight:700;color:#1e40af">${c.pinCode||"—"}</td>
      <td style="font-size:10px;color:#374151">${c.soldTo||"—"}</td>
      <td style="font-size:10px;color:#374151">${c.purchasedBy||"—"}</td>
    </tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet"/>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Tajawal',Arial,sans-serif;direction:rtl;background:#fff;color:#111827;font-size:12px}.wrap{padding:20px;max-width:1100px;margin:0 auto}.no-print{margin-bottom:14px;display:flex;gap:8px}.btn{border:none;border-radius:8px;padding:9px 18px;font-family:'Tajawal',sans-serif;font-size:13px;font-weight:700;cursor:pointer}.hdr{background:linear-gradient(135deg,#1e3a5f,#0f2040);border-radius:10px;padding:16px 22px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center}.hdr h1{font-size:17px;font-weight:900;color:#f0c040;margin-bottom:3px}.hdr p{font-size:11px;color:#93a3b8}.tw{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:18px}table{width:100%;border-collapse:collapse}thead tr{background:linear-gradient(135deg,#1e3a5f,#0f2040)}th{padding:10px 9px;text-align:right;font-size:11px;font-weight:700;color:#f0c040;white-space:nowrap}td{padding:9px;border-bottom:1px solid #f3f4f6;font-size:11px;color:#374151;vertical-align:middle}tr:nth-child(even) td{background:#fafafa}.ft{display:flex;justify-content:space-between;border-top:2px solid #f0c040;padding-top:10px;font-size:10px;color:#9ca3af;margin-top:4px}@media print{@page{size:A4 landscape;margin:10mm}.no-print{display:none!important}}</style></head>
<body><div class="wrap">
<div class="no-print"><button class="btn" style="background:#1e3a5f;color:#f0c040" onclick="window.close()">← رجوع</button><button class="btn" style="background:#166534;color:#fff" onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div>
<div class="hdr"><div><h1>💳 ${title}</h1><p>تاريخ التقرير: ${date} · إجمالي: ${list.length} عميل</p></div></div>
<div class="tw"><table><thead><tr><th>#</th><th>الاسم</th><th>المصرف</th><th>الهاتف</th><th>الرقم الوطني</th><th>المبلغ</th><th>نوع الحجز</th><th>الحالة</th><th>الرقم السري</th><th>بيعت إلى</th><th>اشترى من طرف</th></tr></thead><tbody>${rows}</tbody></table></div>
<div class="ft"><span>تطبيق إدارة بطاقاتك</span><span>${date}</span></div></div></body></html>`;
  const win = window.open("","_blank");
  if (!win) { alert("يرجى السماح بفتح النوافذ المنبثقة في المتصفح"); return; }
  win.document.write(html); win.document.close();
}

function exportCSV(clients) {
  const cols = [
    ["الاسم",c=>c.name||""],
    ["المصرف",c=>c.bankType==="مصرف آخر"?(c.bankTypeOther||"مصرف آخر"):c.bankType||""],
    ["الهاتف 1",c=>c.phone1||""],["الهاتف 2",c=>c.phone2||""],
    ["الرقم الوطني",c=>c.nationalId||""],["جواز السفر",c=>c.passportId||""],
    ["رقم الحساب",c=>c.accountNumber||""],["IBAN",c=>c.iban||""],
    ["المبلغ",c=>c.amount||""],["العملة",c=>c.currency||"د.ل"],
    ["نوع الحجز",c=>c.paymentType||""],["حالة البطاقة",c=>c.cardBooked?"تم الحجز":"لم يتم"],
    ["تاريخ الحجز",c=>c.bookingDate||""],["الرقم السري",c=>c.pinCode||""],
    ["تم البيع",c=>c.isSold?"نعم":"لا"],["بيعت إلى",c=>c.soldTo||""],
    ["اشترى من طرف",c=>c.purchasedBy||""],["ملاحظات",c=>c.notes||""],
  ];
  const H=cols.map(([h])=>h);
  const R=clients.map(c=>cols.map(([,fn])=>fn(c)));
  const esc=v=>`"${String(v).replace(/"/g,'""')}"`;
  const csv=[H,...R].map(r=>r.map(esc).join(",")).join("\r\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  if(navigator.share&&/iPhone|iPad|Android/i.test(navigator.userAgent)){
    const file=new File([blob],`clients_${Date.now()}.csv`,{type:"text/csv;charset=utf-8;"});
    navigator.share({files:[file],title:"قائمة العملاء"}).catch(()=>{
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`clients_${Date.now()}.csv`;a.click();
    });
  } else {
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`clients_${Date.now()}.csv`;a.click();
  }
}

function Notif({n,onClose}) {
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t);},[]);
  return <div className={`notif ${n.type}`}>{n.type==="ok"?"✅":"❌"} {n.msg}</div>;
}

// ─── ACTIVATION ───────────────────────────────────────────────
function ActivationScreen({user, onActivated}) {
  const [code,setCode]=useState("");
  const [refCode,setRefCode]=useState("");
  const [err,setErr]=useState("");
  const [ok,setOk]=useState("");
  const [load,setLoad]=useState(false);

  const activate=async()=>{
    setErr("");setOk("");setLoad(true);
    const trimmed=code.trim().toUpperCase();
    if(!trimmed){setErr("أدخل كود التفعيل");setLoad(false);return;}
    try{
      const ref=doc(db,"subscriptions",trimmed);
      const snap=await getDoc(ref);
      if(!snap.exists()){setErr("الكود غير صحيح أو غير موجود");setLoad(false);return;}
      const data=snap.data();
      if(data.usedBy&&data.usedBy!==user.uid){setErr("هذا الكود مستخدم مسبقاً");setLoad(false);return;}
      const exp=data.expiresAt?.toDate?data.expiresAt.toDate():new Date(data.expiresAt);
      if(exp<new Date()){setErr("هذا الكود منتهي الصلاحية");setLoad(false);return;}
      const refTrimmed=refCode.trim().toUpperCase();
      let bonusDays=0;
      if(refTrimmed){
        const affRef=doc(db,"affiliates",refTrimmed);
        const affSnap=await getDoc(affRef);
        if(!affSnap.exists()){setErr("كود الإحالة غير صحيح");setLoad(false);return;}
        const affData=affSnap.data();
        const usersRef=doc(db,"users",user.uid);
        const userSnap=await getDoc(usersRef);
        if(userSnap.exists()&&userSnap.data().usedReferral){setErr("لقد استخدمت كود إحالة مسبقاً");setLoad(false);return;}
        bonusDays=7;
        const plan=PLANS.find(p=>p.id===data.plan);
        const planPrice=plan?plan.price:null;
        const commPct=affData.commissionPct||COMMISSION_PCT;
        const commAmount=planPrice?Math.round(planPrice*commPct/100*100)/100:null;
        await updateDoc(affRef,{totalReferrals:(affData.totalReferrals||0)+1});
        if(commAmount){
          await addDoc(collection(db,`affiliates/${affSnap.id}/payments`),{
            amount:commAmount,note:`عمولة تلقائية — ${user.email}`,
            date:new Date().toISOString().split("T")[0],paidBy:"تلقائي",
            isAuto:true,subscriptionCode:trimmed,createdAt:serverTimestamp()
          });
          await updateDoc(affRef,{totalPaid:(affData.totalPaid||0)+commAmount});
        }
        await setDoc(doc(db,"users",user.uid),{
          uid:user.uid,email:user.email,usedReferral:true,
          referralCode:refTrimmed,referralUsedAt:serverTimestamp()
        },{merge:true});
      }
      if(bonusDays>0){
        const newExp=new Date(exp);
        newExp.setDate(newExp.getDate()+bonusDays);
        await updateDoc(ref,{usedBy:user.uid,usedAt:serverTimestamp(),usedByEmail:user.email,expiresAt:newExp,planLabel:(data.planLabel||"")+" + أسبوع مجاني 🎁"});
        setOk("تم التفعيل! حصلت على 7 أيام مجانية إضافية 🎁");
      } else {
        await updateDoc(ref,{usedBy:user.uid,usedAt:serverTimestamp(),usedByEmail:user.email});
        setOk("تم التفعيل بنجاح! مرحباً بك 🎉");
      }
      setTimeout(()=>onActivated(),1500);
    }catch(e){setErr("حدث خطأ: "+e.message);}
    setLoad(false);
  };

  return(
    <div className="aw"><style>{CSS}</style>
      <div className="ac">
        <div className="al2"><div className="li"><Logo size={34}/></div><h1>تفعيل الاشتراك</h1><p>مرحباً {user.email}</p></div>
        <div className="act-box">
          <h3>أدخل كود التفعيل</h3>
          <p>احصل على الكود من المسؤول وأدخله أدناه لتفعيل اشتراكك.</p>
          {err&&<div className="me">{err}</div>}
          {ok&&<div className="ms">{ok}</div>}
          <label className="fl">كود التفعيل *</label>
          <input className="code-input" placeholder="XXXXXXXX" value={code}
            onChange={e=>setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoCorrect="off"/>
          <div style={{marginTop:14}}>
            <label className="fl">كود الإحالة <span style={{color:"var(--gray)",fontWeight:400}}>(اختياري — للحصول على أسبوع مجاني 🎁)</span></label>
            <input className="fi ltr" placeholder="مثال: MOHAMAD47" value={refCode}
              onChange={e=>setRefCode(e.target.value.toUpperCase())}
              style={{letterSpacing:2,textAlign:"center",fontSize:15}} autoCapitalize="characters" autoCorrect="off"/>
          </div>
          <button className="bp" style={{marginTop:14}} onClick={activate} disabled={load}>
            {load?<span className="spin spin2"/>:"🔓 تفعيل الاشتراك"}
          </button>
        </div>
        <div className="alink"><button onClick={()=>signOut(auth)}>تسجيل خروج</button></div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────
function AdminPanel({user, onBack}) {
  const [subs,setSubs]=useState([]);
  const [affiliates,setAff]=useState([]);
  const [tab,setTab]=useState("subs");
  const [modal,setModal]=useState(null);
  const [form,setForm]=useState({code:"",plan:"3m",customDays:"",maxClients:500,notes:"",affiliateCode:""});
  const [affForm,setAffForm]=useState({name:"",handle:"",code:"",commissionPct:10,notes:""});
  const [saving,setSaving]=useState(false);
  const [notif,setNotif]=useState(null);
  const notify=(msg,type="ok")=>setNotif({msg,type});

  // ─── تغيير كلمة مرور العميل ───
  const [pwModal,setPwModal]=useState(false);
  const [pwEmail,setPwEmail]=useState("");
  const [pwNew,setPwNew]=useState("");
  const [pwLoad,setPwLoad]=useState(false);
  const [pwErr,setPwErr]=useState("");
  const [pwOk,setPwOk]=useState("");
  const [showPw,setShowPw]=useState(false);

  const changeClientPassword=async()=>{
    setPwErr("");setPwOk("");
    if(!pwEmail.trim()){setPwErr("أدخل البريد الإلكتروني");return;}
    if(!pwNew.trim()||pwNew.length<6){setPwErr("كلمة المرور قصيرة (6+ أحرف)");return;}
    setPwLoad(true);
    try{
      const res=await fetch("/api/changePassword",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          adminToken:ADMIN_SECRET_TOKEN,
          email:pwEmail.trim(),
          newPassword:pwNew
        })
      });
      const data=await res.json();
      if(data.success){
        setPwOk("✅ تم تغيير كلمة المرور بنجاح");
        navigator.clipboard.writeText(`البريد: ${pwEmail.trim()}\nكلمة المرور الجديدة: ${pwNew}`);
        notify("تم التغيير — تم نسخ البيانات للحافظة 📋");
        setTimeout(()=>{setPwModal(false);setPwEmail("");setPwNew("");setPwOk("");},2500);
      }else{
        setPwErr(data.error||"حدث خطأ غير متوقع");
      }
    }catch(e){setPwErr("خطأ في الاتصال بالخادم");}
    setPwLoad(false);
  };

  useEffect(()=>{
    const q1=query(collection(db,"subscriptions"),orderBy("createdAt","desc"));
    const u1=onSnapshot(q1,snap=>setSubs(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const q2=query(collection(db,"affiliates"),orderBy("createdAt","desc"));
    const u2=onSnapshot(q2,snap=>setAff(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return()=>{u1();u2();};
  },[]);

  const genCode=()=>{
    const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({length:8},()=>c[Math.floor(Math.random()*c.length)]).join("");
  };

  const createSub=async()=>{
    if(!form.code.trim()){notify("أدخل الكود","err");return;}
    if(!form.plan&&!form.customDays){notify("اختر الباقة","err");return;}
    setSaving(true);
    try{
      let expDate,planLabel;
      if(form.customDays&&parseInt(form.customDays)>0){
        expDate=new Date();expDate.setDate(expDate.getDate()+parseInt(form.customDays));
        planLabel=`${form.customDays} يوم (مخصص)`;
      }else{
        const plan=PLANS.find(p=>p.id===form.plan);
        expDate=addMonths(plan.months);planLabel=plan.label;
      }
      if(form.affiliateCode.trim()){expDate.setDate(expDate.getDate()+7);planLabel+=" + أسبوع مجاني 🎁";}
      const codeKey=form.code.trim().toUpperCase();
      await setDoc(doc(db,"subscriptions",codeKey),{
        code:codeKey,plan:form.plan||"custom",planLabel,
        maxClients:Math.max(500,parseInt(form.maxClients)||500),expiresAt:expDate,
        usedBy:null,usedAt:null,usedByEmail:null,
        affiliateCode:form.affiliateCode.trim().toUpperCase()||null,
        createdBy:user.uid,createdAt:serverTimestamp(),notes:form.notes,devices:{}
      });
      notify("تم إنشاء الكود ✅");
      setModal(null);setForm({code:"",plan:"3m",customDays:"",maxClients:500,notes:"",affiliateCode:""});
    }catch(e){notify("خطأ: "+e.message,"err");}
    setSaving(false);
  };

  const createAffiliate=async()=>{
    if(!affForm.name.trim()){notify("أدخل الاسم","err");return;}
    if(!affForm.code.trim()){notify("أدخل كود الإحالة","err");return;}
    setSaving(true);
    try{
      const code=affForm.code.trim().toUpperCase();
      const existing=await getDoc(doc(db,"affiliates",code));
      if(existing.exists()){notify("هذا الكود مستخدم مسبقاً","err");setSaving(false);return;}
      await setDoc(doc(db,"affiliates",code),{
        code,name:affForm.name,handle:affForm.handle,
        commissionPct:parseInt(affForm.commissionPct)||10,
        notes:affForm.notes,totalReferrals:0,pendingReferrals:0,
        paidReferrals:0,createdAt:serverTimestamp()
      });
      notify(`تم إنشاء كود المسوّق: ${code} ✅`);
      setModal(null);setAffForm({name:"",handle:"",code:"",commissionPct:10,notes:""});
    }catch(e){notify("خطأ: "+e.message,"err");}
    setSaving(false);
  };

  const [payModal,setPayModal]=useState(null);
  const [payForm,setPayForm]=useState({amount:"",note:"",date:new Date().toISOString().split("T")[0]});
  const [payments,setPayments]=useState({});
  const [selAff,setSelAff]=useState(null);

  useEffect(()=>{
    if(!affiliates.length)return;
    const unsubs=affiliates.map(a=>{
      const q=query(collection(db,`affiliates/${a.id}/payments`),orderBy("createdAt","desc"));
      return onSnapshot(q,snap=>{setPayments(p=>({...p,[a.id]:snap.docs.map(d=>({id:d.id,...d.data()}))}));});
    });
    return()=>unsubs.forEach(u=>u());
  },[affiliates]);

  const addPayment=async()=>{
    if(!payForm.amount||isNaN(parseFloat(payForm.amount))){notify("أدخل المبلغ","err");return;}
    setSaving(true);
    try{
      const aff=payModal;
      const affPays=payments[aff.id]||[];
      const newTotal=affPays.reduce((s,p)=>s+(p.amount||0),0)+parseFloat(payForm.amount);
      await addDoc(collection(db,`affiliates/${aff.id}/payments`),{
        amount:parseFloat(payForm.amount),note:payForm.note||"",
        date:payForm.date,paidBy:user.email,createdAt:serverTimestamp()
      });
      await updateDoc(doc(db,"affiliates",aff.id),{totalPaid:newTotal});
      notify("تم تسجيل الدفعة ✅");
      setPayModal(null);setPayForm({amount:"",note:"",date:new Date().toISOString().split("T")[0]});
    }catch(e){notify("خطأ: "+e.message,"err");}
    setSaving(false);
  };

  const deletePayment=async(affId,payId)=>{
    if(!window.confirm("حذف هذه الدفعة؟"))return;
    await deleteDoc(doc(db,`affiliates/${affId}/payments`,payId));
    notify("تم الحذف","err");
  };

  const deleteSub=async(id)=>{
    if(!window.confirm("هل أنت متأكد؟"))return;
    await deleteDoc(doc(db,"subscriptions",id));notify("تم الحذف","err");
  };

  const renewSub=async(sub)=>{
    const planId=prompt("أدخل الباقة (1m / 3m / 6m / 12m):",sub.plan||"3m");
    if(!planId)return;
    const plan=PLANS.find(p=>p.id===planId);
    if(!plan){alert("باقة غير صحيحة");return;}
    await updateDoc(doc(db,"subscriptions",sub.id),{expiresAt:addMonths(plan.months),plan:planId,planLabel:plan.label});
    notify("تم التجديد ✅");
  };

  return(
    <div className="aw" style={{alignItems:"flex-start",paddingTop:0}}><style>{CSS}</style>
      <div className="admin-wrap">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <h1 style={{fontSize:20,fontWeight:900,color:"var(--gold)"}}>🛡️ لوحة المدير</h1>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {tab==="subs"&&<button className="bsv" onClick={()=>{setForm(f=>({...f,code:genCode()}));setModal("sub");}}>＋ كود جديد</button>}
            {tab==="affiliates"&&<button className="bsv" onClick={()=>setModal("aff")}>＋ مسوّق جديد</button>}
            <button className="ab-btn gold" onClick={()=>{setPwModal(true);setPwErr("");setPwOk("");setPwEmail("");setPwNew("");}}>🔑 تغيير كلمة مرور عميل</button>
            <button className="bs" onClick={onBack}>← رجوع</button>
          </div>
        </div>
        <div className="tabs" style={{marginBottom:16}}>
          <button className={`tab${tab==="subs"?" on":""}`} onClick={()=>setTab("subs")}>🔑 الاشتراكات</button>
          <button className={`tab${tab==="affiliates"?" on":""}`} onClick={()=>setTab("affiliates")}>🤝 المسوّقون</button>
        </div>

        {tab==="subs"&&(
          <>
            <div style={{marginBottom:16,fontSize:13,color:"var(--gray2)"}}>
              الكل: <strong style={{color:"var(--white)"}}>{subs.length}</strong> •
              مفعّلة: <strong style={{color:"var(--ok)"}}>{subs.filter(s=>s.usedBy&&daysLeft(s.expiresAt)>0).length}</strong> •
              متاحة: <strong style={{color:"var(--gold)"}}>{subs.filter(s=>!s.usedBy).length}</strong> •
              منتهية: <strong style={{color:"var(--err)"}}>{subs.filter(s=>daysLeft(s.expiresAt)<=0).length}</strong>
            </div>
            {subs.length===0&&<div className="emp"><div className="ei">🔑</div><div className="et2">لا يوجد اشتراكات بعد</div></div>}
            {subs.map(s=>{
              const days=daysLeft(s.expiresAt);
              const isActive=s.usedBy&&days>0;
              const isExpired=days<=0;
              const isFree=!s.usedBy&&!isExpired;
              const aff=affiliates.find(a=>a.code===s.affiliateCode);
              return(
                <div key={s.id} className="sub-card">
                  <div className="sub-card-header">
                    <div>
                      <span className="sub-code">{s.code||s.id}</span>
                      <button onClick={()=>{navigator.clipboard.writeText(s.code||s.id);notify("تم نسخ الكود ✅");}}
                        style={{background:"rgba(201,168,76,.1)",border:"1px solid rgba(201,168,76,.3)",borderRadius:7,color:"var(--gold)",cursor:"pointer",padding:"3px 8px",fontSize:14,marginRight:8,verticalAlign:"middle"}}>📋</button>
                      {s.planLabel&&<span style={{fontSize:11,color:"var(--gray)",background:"rgba(255,255,255,.06)",padding:"2px 8px",borderRadius:20}}>{s.planLabel}</span>}
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                      {isActive&&<span className="status-chip chip-ok">✅ مفعّل</span>}
                      {isFree&&<span className="status-chip chip-free">🔓 متاح</span>}
                      {isExpired&&<span className="status-chip chip-exp">❌ منتهي</span>}
                    </div>
                  </div>
                  <div className="admin-action-row">
                    <button className="ab-btn gold" onClick={()=>{
                      const msg=`مرحباً 👋\n\nتم تفعيل اشتراكك في تطبيق إدارة بطاقاتك\n\n🔗 رابط التطبيق:\nhttps://banking-app-pink-six.vercel.app\n\n🔑 كود التفعيل:\n${s.code||s.id}\n\n📱 لتثبيت التطبيق:\nافتح الرابط ← زر المشاركة ← "إضافة إلى الشاشة الرئيسية"`;
                      navigator.clipboard.writeText(msg);notify("تم نسخ رسالة الترحيب ✅");
                    }}>✉️ رسالة</button>
                    <button className="ab-btn" onClick={()=>renewSub(s)}>🔄 تجديد</button>
                    <button className="ab-btn" onClick={async()=>{
                      const newMax=prompt("أدخل الحد الجديد للعملاء (الحد الأدنى 500):",s.maxClients||500);
                      if(!newMax)return;
                      const val=parseInt(newMax);
                      if(val<500){alert("الحد الأدنى هو 500 عميل");return;}
                      await updateDoc(doc(db,"subscriptions",s.id),{maxClients:val});
                      notify(`تم تحديث الحد إلى ${val} عميل ✅`);
                    }}>👥 {s.maxClients||"∞"} عميل</button>
                    <button className="ab-btn" onClick={async()=>{
                      const devs=Object.values(s.devices||{});
                      const devList=devs.length?devs.map((d,i)=>`${i+1}. ${d.type||"جهاز"} · ${d.lastSeen?new Date(d.lastSeen).toLocaleDateString("ar-LY"):"—"}`).join("\n"):"لا يوجد أجهزة مسجّلة";
                      if(!window.confirm(`📱 الأجهزة المسجّلة (${devs.length}/7)\n${devList}\n\nهل تريد إعادة ضبط جميع الأجهزة؟`))return;
                      await updateDoc(doc(db,"subscriptions",s.id),{devices:{}});
                      notify("تم إعادة ضبط الأجهزة ✅");
                    }}>📱 {Object.keys(s.devices||{}).length}/7</button>
                    <button className="ab-btn red" onClick={()=>deleteSub(s.id)}>🗑 حذف</button>
                  </div>
                  <div className="sub-meta" style={{marginTop:8}}>
                    📅 ينتهي: {fmt(s.expiresAt)} {days>0?`(${days} يوم)`:""}<br/>
                    {aff&&<><span style={{color:"var(--gold)"}}>🤝 مسوّق: {aff.name} ({s.affiliateCode})</span><br/></>}
                    {s.usedByEmail&&<>👤 {s.usedByEmail}<br/></>}
                    {s.notes&&<span>📝 {s.notes}</span>}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {tab==="affiliates"&&(
          <>
            <div style={{marginBottom:16,fontSize:13,color:"var(--gray2)"}}>
              المسوّقون: <strong style={{color:"var(--white)"}}>{affiliates.length}</strong> •
              إجمالي الإحالات: <strong style={{color:"var(--ok)"}}>{affiliates.reduce((s,a)=>s+(a.totalReferrals||0),0)}</strong> •
              إجمالي المدفوع: <strong style={{color:"var(--gold)"}}>{affiliates.reduce((s,a)=>s+(a.totalPaid||0),0).toLocaleString()} $</strong>
            </div>
            {affiliates.length===0&&<div className="emp"><div className="ei">🤝</div><div className="et2">لا يوجد مسوّقون بعد</div></div>}
            {affiliates.map(a=>{
              const refSubs=subs.filter(s=>s.affiliateCode===a.code);
              const affPays=payments[a.id]||[];
              const totalPaid=affPays.reduce((s,p)=>s+(p.amount||0),0);
              return(
                <div key={a.id} className="sub-card">
                  <div className="sub-card-header">
                    <div>
                      <span style={{fontWeight:900,color:"var(--white)",fontSize:15}}>{a.name}</span>
                      {a.handle&&<span style={{fontSize:12,color:"var(--gray)",marginRight:8}}>@{a.handle}</span>}
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <button className="ab-btn gold" onClick={()=>{navigator.clipboard.writeText(a.code);notify("تم نسخ كود الإحالة ✅");}}>📋 {a.code}</button>
                      <button className="ab-btn green" onClick={()=>{setPayModal(a);setPayForm({amount:"",note:"",date:new Date().toISOString().split("T")[0]});}}>💰 دفعة</button>
                      <button className="ab-btn" onClick={()=>setSelAff(selAff?.id===a.id?null:a)}>📜 السجل ({affPays.length})</button>
                      <button className="ab-btn red" onClick={async()=>{if(!window.confirm("حذف؟"))return;await deleteDoc(doc(db,"affiliates",a.id));notify("تم الحذف","err");}}>🗑 حذف</button>
                    </div>
                  </div>
                  <div className="sub-meta">
                    💹 العمولة: <strong style={{color:"var(--gold)"}}>{a.commissionPct}%</strong> •
                    📊 الإحالات: <strong style={{color:"var(--white)"}}>{a.totalReferrals||0}</strong> •
                    💵 المدفوع: <strong style={{color:"var(--ok)"}}>{totalPaid.toLocaleString()} $</strong><br/>
                    {refSubs.length>0&&<>📋 {refSubs.map(s=><span key={s.id} style={{fontSize:10,background:"rgba(201,168,76,.1)",padding:"1px 6px",borderRadius:10,marginLeft:4,color:"var(--gold)"}}>{s.code}</span>)}<br/></>}
                    {a.notes&&<>📝 {a.notes}</>}
                  </div>
                  {selAff?.id===a.id&&(
                    <div style={{marginTop:12,borderTop:"1px solid var(--border)",paddingTop:12}}>
                      <div style={{fontSize:12,fontWeight:700,color:"var(--gold)",marginBottom:8}}>📜 سجل الدفعات</div>
                      {affPays.length===0
                        ?<div style={{fontSize:12,color:"var(--gray)",textAlign:"center",padding:"12px 0"}}>لا يوجد دفعات مسجلة بعد</div>
                        :affPays.map((p,i)=>(
                          <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:i%2===0?"rgba(255,255,255,.03)":"rgba(255,255,255,.01)",borderRadius:8,marginBottom:4}}>
                            <div style={{flex:1}}>
                              <span style={{fontWeight:700,color:"var(--ok)",fontSize:14}}>${(p.amount||0).toLocaleString()}</span>
                              <span style={{fontSize:11,color:"var(--gray)",marginRight:8}}> · {p.date}</span>
                              {p.note&&<span style={{fontSize:11,color:"var(--gray2)"}}> · {p.note}</span>}
                            </div>
                            <button className="ib" style={{fontSize:11,padding:"3px 7px"}} onClick={()=>deletePayment(a.id,p.id)}>🗑</button>
                          </div>
                        ))
                      }
                      <div style={{marginTop:8,padding:"8px 12px",background:"rgba(201,168,76,.06)",borderRadius:8,fontSize:12,fontWeight:700,color:"var(--gold)"}}>المجموع: ${totalPaid.toLocaleString()}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* MODAL: تغيير كلمة مرور العميل */}
        {pwModal&&(
          <div className="dov" onClick={e=>e.target===e.currentTarget&&setPwModal(false)}>
            <div className="drawer" style={{maxHeight:500}}>
              <div className="dhead">
                <span className="dt">🔑 تغيير كلمة مرور عميل</span>
                <button className="dc" onClick={()=>setPwModal(false)}>✕</button>
              </div>
              <div className="dbody">
                <p style={{fontSize:13,color:"var(--gray2)",marginBottom:16,lineHeight:1.8}}>
                  أدخل بريد العميل وكلمة المرور الجديدة، ثم أرسلها له عبر واتساب.
                </p>
                {pwErr&&<div className="me">{pwErr}</div>}
                {pwOk&&<div className="ms">{pwOk}</div>}
                <div className="fg">
                  <label className="fl">البريد الإلكتروني للعميل *</label>
                  <input className="fi" type="email" inputMode="email"
                    placeholder="example@mail.com"
                    value={pwEmail} onChange={e=>setPwEmail(e.target.value)}
                    autoCapitalize="none" autoCorrect="off"/>
                </div>
                <div className="fg">
                  <label className="fl">كلمة المرور الجديدة *</label>
                  <div style={{position:"relative"}}>
                    <input className="fi" type={showPw?"text":"password"}
                      placeholder="6 أحرف على الأقل"
                      value={pwNew} onChange={e=>setPwNew(e.target.value)}
                      style={{paddingLeft:44}}/>
                    <button onClick={()=>setShowPw(p=>!p)}
                      style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"var(--gray)"}}>
                      {showPw?"🙈":"👁"}
                    </button>
                  </div>
                  <span style={{fontSize:11,color:"var(--gray)",marginTop:4,display:"block"}}>ستُنسخ البيانات تلقائياً للحافظة بعد التغيير 📋</span>
                </div>
                {pwEmail&&pwNew&&pwNew.length>=6&&(
                  <div style={{background:"rgba(201,168,76,.07)",border:"1px solid rgba(201,168,76,.2)",borderRadius:8,padding:"10px 14px",fontSize:12}}>
                    <div style={{color:"var(--gold)",marginBottom:6,fontWeight:700}}>📋 ما سيتم نسخه:</div>
                    <div style={{fontFamily:"monospace",color:"var(--white)",lineHeight:1.8}}>
                      البريد: {pwEmail}<br/>
                      كلمة المرور الجديدة: {showPw?pwNew:"••••••••"}
                    </div>
                  </div>
                )}
              </div>
              <div className="dfoot">
                <button className="bs" onClick={()=>setPwModal(false)}>إلغاء</button>
                <button className="bsv" onClick={changeClientPassword} disabled={pwLoad}>
                  {pwLoad?<span className="spin"/>:"🔑 تغيير ونسخ"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: New Subscription */}
        {modal==="sub"&&(
          <div className="dov" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
            <div className="drawer">
              <div className="dhead"><span className="dt">➕ كود اشتراك جديد</span><button className="dc" onClick={()=>setModal(null)}>✕</button></div>
              <div className="dbody">
                <div className="fg">
                  <label className="fl">كود التفعيل</label>
                  <div style={{display:"flex",gap:8}}>
                    <input className="fi ltr" placeholder="XXXXXXXX" value={form.code}
                      onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} style={{flex:1,letterSpacing:2}}/>
                    <button className="bs" onClick={()=>setForm(f=>({...f,code:genCode()}))}>🎲</button>
                  </div>
                </div>
                <div className="fg">
                  <label className="fl">الباقة</label>
                  <div style={{display:"flex",gap:8,marginBottom:10}}>
                    {PLANS.map(p=>(
                      <button key={p.id} type="button"
                        className={`plan-btn${form.plan===p.id&&!form.customDays?" on":""}`}
                        onClick={()=>setForm(f=>({...f,plan:p.id,customDays:""}))}>
                        {p.label}<br/><span style={{fontSize:11,opacity:.8}}>${p.price}</span>
                      </button>
                    ))}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input className="fi" type="number" inputMode="numeric" placeholder="أو أدخل عدد الأيام يدوياً"
                      value={form.customDays||""} onChange={e=>setForm(f=>({...f,customDays:e.target.value,plan:""}))} style={{flex:1}}/>
                    <span style={{fontSize:12,color:"var(--gray)",whiteSpace:"nowrap"}}>يوم</span>
                  </div>
                </div>
                <div className="fg">
                  <label className="fl">الحد الأقصى للعملاء (الحد الأدنى 500)</label>
                  <input className="fi" type="number" placeholder="500" value={form.maxClients} min="500"
                    onChange={e=>setForm(f=>({...f,maxClients:e.target.value}))} inputMode="numeric"/>
                </div>
                <div className="fg">
                  <label className="fl">🤝 كود المسوّق (اختياري)</label>
                  <select className="fi" value={form.affiliateCode} onChange={e=>setForm(f=>({...f,affiliateCode:e.target.value}))}>
                    <option value="">بدون مسوّق</option>
                    {affiliates.map(a=><option key={a.id} value={a.code}>{a.name} — {a.code} ({a.commissionPct}%)</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="fl">ملاحظة</label>
                  <input className="fi" placeholder="اسم العميل مثلاً" value={form.notes}
                    onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
                </div>
              </div>
              <div className="dfoot">
                <button className="bs" onClick={()=>setModal(null)}>إلغاء</button>
                <button className="bsv" onClick={createSub} disabled={saving}>{saving?<span className="spin"/>:"💾 حفظ"}</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: New Affiliate */}
        {modal==="aff"&&(
          <div className="dov" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
            <div className="drawer">
              <div className="dhead"><span className="dt">🤝 مسوّق جديد</span><button className="dc" onClick={()=>setModal(null)}>✕</button></div>
              <div className="dbody">
                <div className="fg">
                  <label className="fl">اسم المسوّق *</label>
                  <input className="fi" placeholder="مثال: محمد الغانم" value={affForm.name}
                    onChange={e=>setAffForm(f=>({...f,name:e.target.value}))}/>
                </div>
                <div className="fg">
                  <label className="fl">كود الإحالة *</label>
                  <input className="fi ltr" placeholder="MOHAMAD10" value={affForm.code}
                    onChange={e=>setAffForm(f=>({...f,code:e.target.value.toUpperCase().replace(/\s/g,"")}))}
                    style={{letterSpacing:2}} autoCapitalize="characters" autoCorrect="off"/>
                </div>
                <div className="fg">
                  <label className="fl">اسم الحساب (يوتيوب / انستغرام)</label>
                  <input className="fi" placeholder="mohamad_yt" value={affForm.handle}
                    onChange={e=>setAffForm(f=>({...f,handle:e.target.value}))} autoCapitalize="none"/>
                </div>
                <div className="fg">
                  <label className="fl">نسبة العمولة %</label>
                  <div style={{display:"flex",gap:8,marginBottom:8}}>
                    {[10,15,20,25].map(p=>(
                      <button key={p} type="button" className={`plan-btn${affForm.commissionPct===p?" on":""}`}
                        onClick={()=>setAffForm(f=>({...f,commissionPct:p}))}>{p}%</button>
                    ))}
                  </div>
                  <input className="fi" type="number" placeholder="أو أدخل نسبة مخصصة"
                    value={affForm.commissionPct} onChange={e=>setAffForm(f=>({...f,commissionPct:parseInt(e.target.value)||10}))} inputMode="numeric"/>
                </div>
                <div className="fg">
                  <label className="fl">ملاحظات</label>
                  <input className="fi" placeholder="ملاحظات إضافية" value={affForm.notes}
                    onChange={e=>setAffForm(f=>({...f,notes:e.target.value}))}/>
                </div>
              </div>
              <div className="dfoot">
                <button className="bs" onClick={()=>setModal(null)}>إلغاء</button>
                <button className="bsv" onClick={createAffiliate} disabled={saving}>{saving?<span className="spin"/>:"💾 حفظ"}</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Add Payment */}
        {payModal&&(
          <div className="dov" onClick={e=>e.target===e.currentTarget&&setPayModal(null)}>
            <div className="drawer" style={{maxHeight:420}}>
              <div className="dhead">
                <span className="dt">💰 تسجيل دفعة — {payModal.name}</span>
                <button className="dc" onClick={()=>setPayModal(null)}>✕</button>
              </div>
              <div className="dbody">
                <div className="fg">
                  <label className="fl">المبلغ ($) *</label>
                  <input className="fi" type="number" inputMode="decimal" placeholder="0.00"
                    value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))}/>
                </div>
                <div className="fg">
                  <label className="fl">التاريخ *</label>
                  <input className="fi" type="date" value={payForm.date}
                    onChange={e=>setPayForm(f=>({...f,date:e.target.value}))}/>
                </div>
                <div className="fg">
                  <label className="fl">ملاحظة</label>
                  <input className="fi" placeholder="مثال: دفع عبر تحويل بنكي"
                    value={payForm.note} onChange={e=>setPayForm(f=>({...f,note:e.target.value}))}/>
                </div>
              </div>
              <div className="dfoot">
                <button className="bs" onClick={()=>setPayModal(null)}>إلغاء</button>
                <button className="bsv" onClick={addPayment} disabled={saving}>{saving?<span className="spin"/>:"💾 حفظ"}</button>
              </div>
            </div>
          </div>
        )}

        {notif&&<Notif n={notif} onClose={()=>setNotif(null)}/>}
      </div>
    </div>
  );
}

// ─── CLIENT FORM ──────────────────────────────────────────────
const ClientForm = memo(function ClientForm({init, onSave, submitRef}) {
  const [f,setF]=useState(()=>init?{...init}:{...EMPTY});
  const [e,setE]=useState({});
  const set=useCallback((k,v)=>{setF(p=>({...p,[k]:v}));setE(p=>({...p,[k]:undefined}));},[]);

  const submit=useCallback(()=>{
    const err={};
    if(!f.name.trim())err.name="مطلوب";
    if(!f.bankType)err.bankType="مطلوب";
    if(f.bankType==="مصرف آخر"&&!f.bankTypeOther?.trim())err.bankTypeOther="اكتب اسم المصرف";
    if(!f.phone1.trim())err.phone1="مطلوب";
    if(!f.nationalId.trim())err.nationalId="مطلوب";
    if(Object.keys(err).length){setE(err);return;}
    onSave(f);
  },[f,onSave]);
  if(submitRef)submitRef.current=submit;

  return(
    <div className="g2">
      <div className="fg full"><label className="fl">الاسم الكامل *</label>
        <input className={`fi${e.name?" ef":""}`} placeholder="اسم العميل" value={f.name}
          onChange={ev=>set("name",ev.target.value)} autoComplete="off"/>
        {e.name&&<span className="et">{e.name}</span>}
      </div>
      <div className="fg full"><label className="fl">نوع المصرف *</label>
        <select className={`fi${e.bankType?" ef":""}`} value={f.bankType} onChange={ev=>set("bankType",ev.target.value)}>
          <option value="">اختر المصرف</option>
          {BANKS.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        {e.bankType&&<span className="et">{e.bankType}</span>}
      </div>
      {f.bankType==="مصرف آخر"&&(
        <div className="fg full"><label className="fl">اسم المصرف *</label>
          <input className={`fi${e.bankTypeOther?" ef":""}`} placeholder="اكتب اسم المصرف يدوياً"
            value={f.bankTypeOther||""} onChange={ev=>set("bankTypeOther",ev.target.value)}/>
          {e.bankTypeOther&&<span className="et">{e.bankTypeOther}</span>}
        </div>
      )}
      <div className="fg"><label className="fl">رقم الهاتف 1 *</label>
        <input className={`fi${e.phone1?" ef":""}`} type="tel" placeholder="0912345678"
          value={f.phone1} onChange={ev=>set("phone1",ev.target.value)}/>
        {e.phone1&&<span className="et">{e.phone1}</span>}
      </div>
      <div className="fg"><label className="fl">رقم الهاتف 2</label>
        <input className="fi" type="tel" placeholder="اختياري" value={f.phone2} onChange={ev=>set("phone2",ev.target.value)}/>
      </div>
      <div className="fg full"><label className="fl">الرقم الوطني *</label>
        <input className={`fi${e.nationalId?" ef":""}`} placeholder="الرقم الوطني"
          value={f.nationalId} onChange={ev=>set("nationalId",ev.target.value)} inputMode="numeric"/>
        {e.nationalId&&<span className="et">{e.nationalId}</span>}
      </div>
      <div className="fg full"><label className="fl">رقم جواز السفر <span style={{color:"var(--gray)",fontWeight:400,fontSize:11}}>(اختياري)</span></label>
        <input className="fi ltr" placeholder="A12345678"
          value={f.passportId||""} onChange={ev=>set("passportId",ev.target.value.toUpperCase())}
          autoCapitalize="characters" autoCorrect="off"/>
      </div>
      <div className="fg"><label className="fl">رقم الحساب المصرفي</label>
        <input className="fi ltr" placeholder="ACC-123456789"
          value={f.accountNumber} autoCapitalize="characters" autoCorrect="off"
          onChange={ev=>set("accountNumber",ev.target.value.replace(/[^A-Za-z0-9\s\-]/g,""))}/>
      </div>
      <div className="fg"><label className="fl">رقم IBAN</label>
        <input className="fi ltr" placeholder="LY83002000001016000012"
          value={f.iban} autoCapitalize="characters" autoCorrect="off"
          onChange={ev=>set("iban",ev.target.value.replace(/[^A-Za-z0-9\s\-]/g,"").toUpperCase())}/>
      </div>
      <div className="fg full"><label className="fl">المبلغ المدفوع</label>
        <div style={{display:"flex",gap:7}}>
          <input className="fi" type="number" inputMode="decimal" placeholder="0.00"
            value={f.amount} onChange={ev=>set("amount",ev.target.value)} style={{flex:1}}/>
          <select className="fi" value={f.currency} onChange={ev=>set("currency",ev.target.value)} style={{width:100,flexShrink:0}}>
            <option value="د.ل">دينار ليبي</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
      <div className="fg full"><label className="fl">تم الشراء من طرف</label>
        <input className="fi" placeholder="اسم الموظف / المسؤول" value={f.purchasedBy}
          onChange={ev=>set("purchasedBy",ev.target.value)}/>
      </div>
      <div className="fg full"><label className="fl">نوع الحجز</label>
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
      <div className="fg full">
        <div className="chk">
          <input type="checkbox" id="cb" checked={f.cardBooked} onChange={ev=>set("cardBooked",ev.target.checked)}/>
          <label htmlFor="cb">✅ تم حجز البطاقة</label>
        </div>
      </div>
      {f.cardBooked&&(
        <div className="fg full"><label className="fl">تاريخ الحجز</label>
          <input className="fi" type="date" value={f.bookingDate} onChange={ev=>set("bookingDate",ev.target.value)}/>
        </div>
      )}
      <div className="fg full"><label className="fl">الرقم السري للبطاقة</label>
        <input className="fi ltr" placeholder="1234" value={f.pinCode} inputMode="numeric" maxLength={4}
          onChange={ev=>set("pinCode",ev.target.value.replace(/[^0-9]/g,"").slice(0,4))}
          style={{letterSpacing:6,fontSize:20,textAlign:"center"}}/>
      </div>
      <div className="fg full">
        <div className="chk">
          <input type="checkbox" id="isSold" checked={f.isSold||false} onChange={ev=>set("isSold",ev.target.checked)}/>
          <label htmlFor="isSold">🔴 تم بيع البطاقة</label>
        </div>
      </div>
      {f.isSold&&(
        <div className="fg full"><label className="fl">تم بيع البطاقة إلى طرف</label>
          <input className="fi" placeholder="اسم المشتري / الجهة" value={f.soldTo||""}
            onChange={ev=>set("soldTo",ev.target.value)}/>
        </div>
      )}
      <div className="fg full"><label className="fl">ملاحظات</label>
        <textarea className="fi" rows={3} placeholder="ملاحظات إضافية..." value={f.notes}
          onChange={ev=>set("notes",ev.target.value)}/>
      </div>
    </div>
  );
});

// ─── VIEW CLIENT ──────────────────────────────────────────────
function ViewClient({c,onClose,onEdit}) {
  const bank=c.bankType==="مصرف آخر"?(c.bankTypeOther||"مصرف آخر"):c.bankType;
  const rows=[
    ["الاسم",c.name],["المصرف",bank],["الهاتف 1",c.phone1],["الهاتف 2",c.phone2||"—"],
    ["الرقم الوطني",c.nationalId],["جواز السفر",c.passportId||"—"],
    ["رقم الحساب",c.accountNumber||"—",true],["رقم IBAN",c.iban||"—",true],
    ["المبلغ",c.amount?`${parseFloat(c.amount).toLocaleString()} ${c.currency}`:"—"],
    ["تم الشراء من طرف",c.purchasedBy||"—"],["نوع الحجز",c.paymentType||"—"],
    ["حالة البطاقة",c.cardBooked?"✅ تم الحجز":"⏳ لم يتم بعد"],
    ["تاريخ الحجز",c.bookingDate||"—"],["الرقم السري",c.pinCode||"—"],
    ["حالة البيع",c.isSold?"🔴 تم البيع":"🟢 لم يُباع"],
    ["بيعت إلى",c.soldTo||"—"],["ملاحظات",c.notes||"—"],
    ["تاريخ الإضافة",fmt(c.createdAt)],["أضيف بواسطة",c.createdBy||"—"],
  ];
  return(
    <div className="dov" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="drawer">
        <div className="dhead"><span className="dt">👤 {c.name}</span><button className="dc" onClick={onClose}>✕</button></div>
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

// ─── AUTH ─────────────────────────────────────────────────────
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

  return(
    <div className="aw"><style>{CSS}</style>
      <div className="ac">
        <div className="al2"><div className="li"><Logo size={34}/></div><h1>إدارة بطاقاتك</h1><p>منصة آمنة ومتزامنة عبر جميع الأجهزة</p></div>
        {!reset?(
          <>
            <div className="tabs">
              <button className={`tab${tab==="login"?" on":""}`} onClick={()=>{setTab("login");setErr("");}}>تسجيل الدخول</button>
              <button className={`tab${tab==="register"?" on":""}`} onClick={()=>{setTab("register");setErr("");}}>حساب جديد</button>
            </div>
            {err&&<div className="me">{err}</div>}
            {ok&&<div className="ms">{ok}</div>}
            <div className="fg"><label className="fl">البريد الإلكتروني</label>
              <input className="fi" type="email" inputMode="email" placeholder="example@mail.com"
                value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}
                autoCapitalize="none" autoCorrect="off" autoComplete="email"/>
            </div>
            <div className="fg"><label className="fl">كلمة المرور</label>
              <input className="fi" type="password" placeholder="••••••••"
                value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handle()}
                autoComplete="current-password"/>
            </div>
            <button className="bp" onClick={handle} disabled={load}>{load?<span className="spin spin2"/>:(tab==="login"?"🔐 تسجيل الدخول":"✨ إنشاء حساب")}</button>
            {tab==="login"&&<div className="alink">نسيت كلمة المرور؟ <button onClick={()=>{setReset(true);setErr("");}}>إعادة التعيين</button></div>}
            <div className="alink" style={{marginTop:8}}>للمساعدة تواصل عبر <a href="https://wa.me/218945888844" target="_blank" rel="noopener noreferrer" style={{color:"#25D366",fontWeight:700,textDecoration:"none"}}>واتساب 📱</a></div>
          </>
        ):(
          <>
            <h3 style={{color:"var(--gold)",marginBottom:7}}>إعادة تعيين كلمة المرور</h3>
            <p style={{fontSize:12,color:"var(--gray)",marginBottom:16}}>سنرسل رابطاً لبريدك</p>
            {err&&<div className="me">{err}</div>}
            {ok&&<div className="ms">{ok}</div>}
            <div className="fg"><label className="fl">البريد الإلكتروني</label>
              <input className="fi" type="email" inputMode="email" placeholder="example@mail.com"
                value={email} onChange={e=>setEmail(e.target.value)} autoCapitalize="none"/>
            </div>
            <button className="bp" onClick={async()=>{
              setErr("");setOk("");setLoad(true);
              if(!email.trim()){setErr("أدخل بريدك");setLoad(false);return;}
              try{await sendPasswordResetEmail(auth,email.trim());setOk("تم الإرسال ✉️");setReset(false);}
              catch{setErr("البريد غير مسجل");}
              setLoad(false);
            }} disabled={load}>{load?<span className="spin spin2"/>:"📨 إرسال"}</button>
            <div className="alink"><button onClick={()=>{setReset(false);setErr("");}}>← العودة</button></div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [user,setUser]=useState(null);
  const [ready,setReady]=useState(false);
  const [subStatus,setSubStatus]=useState(null);
  const [subDays,setSubDays]=useState(null);
  const [maxClients,setMaxClients]=useState(null);
  const [clients,setClients]=useState([]);
  const [page,setPage]=useState("clients");
  const [modal,setModal]=useState(null);
  const [sel,setSel]=useState(null);
  const [notif,setNotif]=useState(null);
  const [bar,setBar]=useState(false);
  const [saving,setSaving]=useState(false);
  const [dark,setDark]=useState(()=>localStorage.getItem("theme")!=="light");
  const [search,setSearch]=useState("");
  const [filterStatus,setFilterStatus]=useState("all");
  const [filterBank,setFilterBank]=useState("all");
  const [sortBy,setSortBy]=useState("newest");
  const [synced,setSynced]=useState(false);
  const [showAdmin,setShowAdmin]=useState(false);
  const addRef=useRef(null);
  const editRef=useRef(null);
  const isAdmin=user?.uid===ADMIN_UID;
  const notify=useCallback((msg,type="ok")=>setNotif({msg,type}),[]);

  useEffect(()=>{
    return onAuthStateChanged(auth,u=>{setUser(u);setReady(true);if(!u){setSubStatus(null);setSynced(false);}});
  },[]);

  const getDeviceId=useCallback(()=>{
    let id=localStorage.getItem("deviceId");
    if(!id){id="dev_"+Math.random().toString(36).substr(2,9)+"_"+Date.now().toString(36);localStorage.setItem("deviceId",id);}
    return id;
  },[]);

  useEffect(()=>{
    if(!user){setSubStatus(null);return;}
    if(user.uid===ADMIN_UID){setSubStatus("active");setSubDays(9999);setMaxClients(999999);return;}
    const q=query(collection(db,"subscriptions"),where("usedBy","==",user.uid));
    return onSnapshot(q,async snap=>{
      if(snap.empty){setSubStatus("none");return;}
      const subDoc=snap.docs[0];
      const sub=subDoc.data();
      const days=daysLeft(sub.expiresAt);
      setSubDays(days);setMaxClients(sub.maxClients||999999);
      if(days<=0){setSubStatus("expired");return;}
      const deviceId=getDeviceId();
      const devices=sub.devices||{};
      const ua=navigator.userAgent;
      const getDeviceInfo=()=>{
        if(/iPhone/i.test(ua))return"iPhone 📱";if(/iPad/i.test(ua))return"iPad 📱";
        if(/Samsung|SM-/i.test(ua))return"Samsung 📱";if(/Android/i.test(ua))return"Android 📱";
        if(/Windows/i.test(ua))return"Windows 💻";if(/Mac/i.test(ua))return"Mac 💻";
        return"جهاز غير معروف";
      };
      const deviceEntry={uid:user.uid,email:user.email,lastSeen:new Date().toISOString(),type:getDeviceInfo()};
      if(devices[deviceId]){
        await updateDoc(doc(db,"subscriptions",subDoc.id),{[`devices.${deviceId}`]:deviceEntry});
        setSubStatus("active");
      }else{
        if(Object.keys(devices).length>=7)setSubStatus("device_limit");
        else{await updateDoc(doc(db,"subscriptions",subDoc.id),{[`devices.${deviceId}`]:deviceEntry});setSubStatus("active");}
      }
    });
  },[user,getDeviceId]);

  useEffect(()=>{
    if(!user||subStatus==="none"){setClients([]);setSynced(false);return;}
    const qc=query(collection(db,"clients"),where("uid","==",user.uid),orderBy("createdAt","desc"));
    const u1=onSnapshot(qc,snap=>{setClients(snap.docs.map(d=>({id:d.id,...d.data()})));setSynced(true);});
    return()=>{u1();};
  },[user,subStatus]);

  const canWrite=subStatus==="active";
  const atLimit=maxClients&&clients.length>=maxClients;

  const handleAdd=useCallback(async(form)=>{
    if(!canWrite){notify("اشتراكك منتهي","err");return;}
    if(atLimit){notify(`وصلت للحد الأقصى (${maxClients} عميل)`,"err");return;}
    setSaving(true);
    try{
      await addDoc(collection(db,"clients"),{...form,uid:user.uid,createdBy:user.email,createdAt:serverTimestamp(),updatedAt:null,updatedBy:null});
      setModal(null);notify("تم إضافة العميل ✅");
    }catch(e){notify("خطأ: "+e.message,"err");}
    setSaving(false);
  },[user,notify,canWrite,atLimit,maxClients]);

  const handleEdit=useCallback(async(form)=>{
    if(!canWrite){notify("اشتراكك منتهي","err");return;}
    setSaving(true);
    try{
      await updateDoc(doc(db,"clients",sel.id),{...form,updatedBy:user.email,updatedAt:serverTimestamp()});
      setModal(null);notify("تم التعديل ✏️");
    }catch(e){notify("خطأ: "+e.message,"err");}
    setSaving(false);
  },[user,sel,notify,canWrite]);

  const handleDelete=useCallback(async()=>{
    if(!canWrite){notify("اشتراكك منتهي","err");return;}
    setSaving(true);
    try{
      await deleteDoc(doc(db,"clients",sel.id));
      setModal(null);notify("تم الحذف 🗑","err");
    }catch(e){notify("خطأ: "+e.message,"err");}
    setSaving(false);
  },[user,sel,notify,canWrite]);

  const filtered=clients.filter(c=>{
    const q=search.toLowerCase().trim();
    const m=!q||c.name?.toLowerCase().includes(q)||c.phone1?.includes(q)||c.phone2?.includes(q)||
      c.nationalId?.includes(q)||c.passportId?.toLowerCase().includes(q)||c.iban?.toLowerCase().includes(q);
    const bank=c.bankType==="مصرف آخر"?c.bankTypeOther||"مصرف آخر":c.bankType;
    const fb=filterBank==="all"||bank===filterBank||c.bankType===filterBank;
    const fs=filterStatus==="all"
      ||(filterStatus==="booked"&&c.cardBooked&&!c.isSold)
      ||(filterStatus==="pending"&&!c.cardBooked&&!c.isSold)
      ||(filterStatus==="sold"&&c.isSold);
    return m&&fb&&fs;
  }).sort((a,b)=>{
    if(sortBy==="newest")return 0;
    if(sortBy==="booking_asc"||sortBy==="booking_desc"){
      const da=a.bookingDate?new Date(a.bookingDate):new Date(0);
      const db2=b.bookingDate?new Date(b.bookingDate):new Date(0);
      return sortBy==="booking_asc"?da-db2:db2-da;
    }
    if(sortBy==="alpha")return(a.name||"").localeCompare(b.name||"","ar");
    return 0;
  });

  const total=clients.length;
  const booked=clients.filter(c=>c.cardBooked&&!c.isSold).length;
  const pending=clients.filter(c=>!c.cardBooked&&!c.isSold).length;
  const sold=clients.filter(c=>c.isSold).length;
  const totalAmt=clients.filter(c=>!c.isSold).reduce((s,c)=>s+(parseFloat(c.amount)||0),0);
  const bankNames=[...new Set(clients.map(c=>c.bankType==="مصرف آخر"?c.bankTypeOther||"مصرف آخر":c.bankType).filter(Boolean))];

  if(!ready)return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0a1628"}}><style>{CSS}</style><span className="spin spin2" style={{width:36,height:36,borderWidth:3}}/></div>);
  if(!user)return <AuthScreen onLogin={u=>setUser(u)}/>;
  if(subStatus==="none")return <ActivationScreen user={user} onActivated={()=>setSubStatus(null)}/>;
  if(subStatus==="device_limit")return(
    <div className="aw"><style>{CSS}</style>
      <div className="ac">
        <div className="al2"><div className="li">🚫</div><h1>تجاوزت الحد الأقصى للأجهزة</h1></div>
        <div style={{background:"rgba(231,76,60,.08)",border:"1px solid rgba(231,76,60,.25)",borderRadius:12,padding:20,marginBottom:20,textAlign:"center"}}>
          <p style={{color:"var(--gray2)",fontSize:14,lineHeight:1.8}}>اشتراكك مسجّل على <strong style={{color:"var(--white)"}}>7 أجهزة</strong> وهو الحد الأقصى.<br/>تواصل مع المسؤول لإعادة ضبط أجهزتك.</p>
        </div>
        <button className="bp" onClick={()=>signOut(auth)}>تسجيل خروج</button>
      </div>
    </div>
  );
  if(showAdmin&&isAdmin)return <AdminPanel user={user} onBack={()=>setShowAdmin(false)}/>;

  return(
    <div className={`app ${dark?"dark":"light"}`}>
      <style>{CSS}</style>
      <div className="mh">
        <button className="mb" onClick={()=>setBar(o=>!o)}>☰</button>
        <span style={{color:"var(--gold)",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:6}}><Logo size={22}/>إدارة بطاقاتك</span>
        {canWrite&&!atLimit?<button className="mb" onClick={()=>{setSel(null);setModal("add");setBar(false);}}>＋</button>
          :<span className="readonly-badge">{atLimit?"🚫 حد أقصى":"👁 قراءة"}</span>}
      </div>
      {bar&&<div className="ov open" onClick={()=>setBar(false)}/>}
      <div className={`sidebar${bar?" open":""}`}>
        <div className="sl">
          <div className="sl-i"><Logo size={26}/></div>
          <div className="sl-t"><h2>إدارة بطاقاتك</h2><p>منصة آمنة ومتزامنة</p></div>
        </div>
        <nav>
          {[{k:"dashboard",i:"📊",l:"الإحصائيات"},{k:"clients",i:"👥",l:"العملاء"}].map(n=>(
            <button key={n.k} className={`ni${page===n.k?" on":""}`} onClick={()=>{setPage(n.k);setBar(false);}}>
              <span>{n.i}</span>{n.l}
            </button>
          ))}
          {isAdmin&&<button className="ni" style={{marginTop:8,color:"var(--gold)"}} onClick={()=>{setShowAdmin(true);setBar(false);}}><span>🛡️</span>لوحة المدير</button>}
          <a href="https://wa.me/218945888844" target="_blank" rel="noopener noreferrer" className="ni" style={{marginTop:4,color:"#25D366",textDecoration:"none",display:"flex",alignItems:"center",gap:9,padding:"10px 11px",borderRadius:9,fontSize:13,fontWeight:500}}><span>📱</span>تواصل مع خدمة العملاء</a>
        </nav>
        <div className="su">
          <div className="su-a">{user.email[0].toUpperCase()}</div>
          <div className="su-e">{user.email}</div>
          <button className="lb" onClick={()=>setDark(d=>{localStorage.setItem("theme",d?"light":"dark");return !d;})}>{dark?"☀️":"🌙"}</button>
          <button className="lb" onClick={()=>{if(window.confirm("هل تريد تسجيل الخروج؟"))signOut(auth);}}>⎋</button>
        </div>
      </div>

      <main className="main">
        {subStatus==="expired"&&<div className="sub-expired">⚠️ انتهى اشتراكك — مشاهدة فقط. تواصل مع المسؤول للتجديد.</div>}
        {subStatus==="active"&&subDays<=7&&subDays>0&&subDays<9999&&<div className="mw">⚠️ اشتراكك ينتهي خلال {subDays} أيام. تواصل مع المسؤول للتجديد.</div>}

        {page==="dashboard"&&(
          <>
            <div className="ph">
              <h1 className="pt">لوحة <span>الإحصائيات</span></h1>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                {synced&&<span className="syn">🔄 متزامن</span>}
                {subStatus==="active"&&subDays<9999&&<span className="sub-ok">✅ {subDays} يوم</span>}
              </div>
            </div>
            <div className="stats">
              {[
                {i:"👥",v:total,l:"إجمالي العملاء",s:"عميل مسجل"},
                {i:"✅",v:booked,l:"تم حجز البطاقة",s:`${total?Math.round(booked/total*100):0}%`,c:"var(--ok)"},
                {i:"⏳",v:pending,l:"لم يتم الحجز",s:"بانتظار",c:"var(--warn)"},
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
          </>
        )}

        {page==="clients"&&(
          <>
            <div className="ph">
              <h1 className="pt">قائمة <span>العملاء</span></h1>
              <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
                {synced&&<span className="syn">🔄 متزامن</span>}
                <button className="eb" onClick={()=>generatePDF(filtered)}>🖨️ PDF</button>
                <button className="eb" onClick={()=>exportCSV(clients)}>📤 CSV</button>
                {canWrite&&!atLimit&&<button className="add-btn" onClick={()=>{setSel(null);setModal("add");}}>＋ إضافة</button>}
              </div>
            </div>
            <div className="fr">
              <div className="sw" style={{flex:2,minWidth:160}}>
                <span className="si2">🔍</span>
                <input className="fi" placeholder="بحث بالاسم، الجوال، الرقم الوطني، IBAN..."
                  value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <select className="fs" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="newest">📅 الأحدث إضافةً</option>
                <option value="booking_asc">📅 تاريخ الحجز: الأقدم أولاً</option>
                <option value="booking_desc">📅 تاريخ الحجز: الأحدث أولاً</option>
                <option value="alpha">🔤 أبجدي</option>
              </select>
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
                  <thead><tr><th>الاسم</th><th className="hm">المصرف</th><th className="hm">المبلغ</th><th>البطاقة</th><th></th></tr></thead>
                  <tbody>
                    {filtered.map(c=>{
                      const bank=c.bankType==="مصرف آخر"?c.bankTypeOther||"مصرف آخر":c.bankType;
                      return(
                        <tr key={c.id} className={c.isSold?"sold-row":""}>
                          <td className="nm">{c.name}</td>
                          <td className="hm" style={{fontSize:12}}>{bank}</td>
                          <td className="am hm">{c.amount?`${parseFloat(c.amount).toLocaleString()} ${c.currency}`:"—"}</td>
                          <td>{c.isSold?<span className="badge sold">🔴 تم البيع</span>:c.cardBooked?<span className="badge ok">✅ تم</span>:<span className="badge nd">⏳ لم يتم</span>}</td>
                          <td><div className="ab">
                            <button className="ib" onClick={()=>{setSel(c);setModal("view");}}>👁</button>
                            {canWrite&&<button className="ib" onClick={()=>{setSel(c);setModal("edit");}}>✏️</button>}
                            {canWrite&&<button className="ib" onClick={()=>{setSel(c);setModal("del");}}>🗑</button>}
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
      </main>

      {modal==="add"&&canWrite&&!atLimit&&(
        <div className="dov" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="drawer">
            <div className="dhead"><span className="dt">➕ إضافة عميل جديد</span><button className="dc" onClick={()=>setModal(null)}>✕</button></div>
            <div className="dbody"><ClientForm onSave={handleAdd} submitRef={addRef}/></div>
            <div className="dfoot">
              <button className="bs" onClick={()=>setModal(null)}>إلغاء</button>
              <button className="bsv" onClick={()=>addRef.current&&addRef.current()} disabled={saving}>{saving?<span className="spin"/>:"💾 حفظ"}</button>
            </div>
          </div>
        </div>
      )}
      {modal==="edit"&&sel&&canWrite&&(
        <div className="dov" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="drawer">
            <div className="dhead"><span className="dt">✏️ تعديل بيانات العميل</span><button className="dc" onClick={()=>setModal(null)}>✕</button></div>
            <div className="dbody"><ClientForm init={sel} onSave={handleEdit} submitRef={editRef}/></div>
            <div className="dfoot">
              <button className="bs" onClick={()=>setModal(null)}>إلغاء</button>
              <button className="bsv" onClick={()=>editRef.current&&editRef.current()} disabled={saving}>{saving?<span className="spin"/>:"💾 حفظ"}</button>
            </div>
          </div>
        </div>
      )}
      {modal==="view"&&sel&&<ViewClient c={sel} onClose={()=>setModal(null)} onEdit={c=>{setSel(c);setModal("edit");}}/>}
      {modal==="del"&&sel&&canWrite&&(
        <div className="dov" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="drawer" style={{maxHeight:280}}>
            <div className="dhead"><span className="dt">🗑 تأكيد الحذف</span><button className="dc" onClick={()=>setModal(null)}>✕</button></div>
            <div className="dbody"><p style={{color:"var(--gray2)",lineHeight:1.8}}>هل أنت متأكد من حذف <strong style={{color:"var(--white)"}}>{sel.name}</strong>؟<br/><span style={{color:"var(--err)",fontSize:12}}>لا يمكن التراجع عن هذا الإجراء.</span></p></div>
            <div className="dfoot">
              <button className="bs" onClick={()=>setModal(null)}>إلغاء</button>
              <button style={{background:"var(--err)",border:"none",borderRadius:10,padding:"10px 24px",color:"#fff",fontFamily:"Tajawal,sans-serif",fontSize:14,fontWeight:700,cursor:"pointer"}} onClick={handleDelete} disabled={saving}>{saving?<span className="spin"/>:"حذف نهائياً"}</button>
            </div>
          </div>
        </div>
      )}
      {notif&&<Notif n={notif} onClose={()=>setNotif(null)}/>}
    </div>
  );
}
