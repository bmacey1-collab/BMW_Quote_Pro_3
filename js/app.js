(() => {
"use strict";
const $ = id => document.getElementById(id);
const money = new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"});
const KEYS={settings:"bqp3_settings",programs:"bqp3_programs",deals:"bqp3_deals",connection:"bqp3_connection",draft:"bqp3_autosave_draft"};
let supabaseClient=null,currentUser=null,autosaveTimer=null,autosaveRestored=false;
let state=createEmptyDeal();

function createEmptyDeal(){
 return {id:crypto.randomUUID(),quoteNumber:"Q-"+new Date().toISOString().replace(/\D/g,"").slice(0,14),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
 customer:{clientId:"",firstName:"",lastName:"",coFirstName:"",coLastName:"",email:"",phone:"",salesperson:"",currentPayment:0},
 vehicle:{stockNumber:"",vin:"",year:"",make:"BMW",model:"",msrp:0,discount:0,cost:0,pack:0,taxRate:null},
 trade:{vin:"",vehicle:"",allowance:0,acv:0,payoff:0,cashDown:0,equityMethod:"cap",equityCashBack:0},
 fees:{doc:{amount:595,treatment:"upfront"},reg:{amount:130,treatment:"upfront"},acq:{amount:925,treatment:"capitalize"},misc:{amount:0,treatment:"capitalize"}},
 incentives:[],scenarios:[],notes:"",presentation:{showPaymentComparison:true,combineDiscountIncentives:false,showSignature:false}};
}
function settings(){return JSON.parse(localStorage.getItem(KEYS.settings)||"null")||{dealerName:"BMW of Peabody",defaultTax:6.25,reserveShare:70,defaultSalesperson:"Brian Macey",docFee:595,regFee:130,acqFee:925,miscFee:0,salespeople:["Brian Macey"],disclaimer:"Figures are estimates and remain subject to credit approval, vehicle availability, final appraisal, and current manufacturer programs."};}
function programs(){return JSON.parse(localStorage.getItem(KEYS.programs)||"[]");}
function localDeals(){return JSON.parse(localStorage.getItem(KEYS.deals)||"[]");}
function saveLocalDeals(rows){localStorage.setItem(KEYS.deals,JSON.stringify(rows));}
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),3000);}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function showPage(name){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+name));document.querySelectorAll(".main-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===name));if(name==="quote")renderQuote();if(name==="worksheet")renderWorksheet();if(name==="saved")renderSaved();if(name==="dashboard")renderDashboard();if(name==="programs")renderPrograms();}
function bindNav(){document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));document.querySelectorAll("[data-page-link]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.pageLink)));}
function applySettingsToDeal(force=false){const s=settings();if(force||state.vehicle.taxRate===null)state.vehicle.taxRate=s.defaultTax;if(force||!state.customer.salesperson)state.customer.salesperson=s.defaultSalesperson;state.fees.doc.amount=force?s.docFee:(state.fees.doc.amount??s.docFee);state.fees.reg.amount=force?s.regFee:(state.fees.reg.amount??s.regFee);state.fees.acq.amount=force?s.acqFee:(state.fees.acq.amount??s.acqFee);state.fees.misc.amount=force?s.miscFee:(state.fees.misc.amount??s.miscFee);populateSalespeople();writeStateToForm();}
function populateSalespeople(){const s=settings(),sel=$("salesperson");sel.innerHTML='<option value="">Select salesperson</option>'+s.salespeople.map(n=>`<option>${esc(n)}</option>`).join("");sel.value=state.customer.salesperson||s.defaultSalesperson||"";}
function readFormToState(){state.customer={clientId:state.customer.clientId||"",firstName:$("firstName").value.trim(),lastName:$("lastName").value.trim(),coFirstName:$("coFirstName").value.trim(),coLastName:$("coLastName").value.trim(),email:$("customerEmail").value.trim().toLowerCase(),phone:$("customerPhone").value.trim(),salesperson:$("salesperson").value,currentPayment:num($("currentPayment").value)};
state.vehicle={stockNumber:$("stockNumber").value.trim(),vin:$("vin").value.trim().toUpperCase(),year:$("year").value,make:$("make").value.trim(),model:$("model").value.trim(),msrp:num($("msrp").value),discount:num($("discount").value),cost:num($("vehicleCost").value),pack:num($("pack").value),taxRate:$("taxRate").value===""?null:num($("taxRate").value)};
state.trade={vin:$("tradeVin").value.trim().toUpperCase(),vehicle:$("tradeVehicle").value.trim(),allowance:num($("tradeAllowance").value),acv:num($("tradeAcv").value),payoff:num($("tradePayoff").value),cashDown:num($("cashDown").value),equityMethod:$("equityMethod").value,equityCashBack:num($("equityCashBack").value)};
state.fees={doc:{amount:num($("docFee").value),treatment:$("docTreatment").value},reg:{amount:num($("regFee").value),treatment:$("regTreatment").value},acq:{amount:num($("acqFee").value),treatment:$("acqTreatment").value},misc:{amount:num($("miscFee").value),treatment:$("miscTreatment").value}};
state.notes=$("managerNotes").value;state.presentation={showPaymentComparison:$("showPaymentComparison").checked,combineDiscountIncentives:$("combineDiscountIncentives").checked,showSignature:$("showSignature").checked};state.updatedAt=new Date().toISOString();}
function writeStateToForm(){const map={firstName:state.customer.firstName,lastName:state.customer.lastName,coFirstName:state.customer.coFirstName,coLastName:state.customer.coLastName,customerEmail:state.customer.email||"",customerPhone:state.customer.phone||"",currentPayment:state.customer.currentPayment||"",stockNumber:state.vehicle.stockNumber,vin:state.vehicle.vin,year:state.vehicle.year,make:state.vehicle.make,model:state.vehicle.model,msrp:state.vehicle.msrp||"",discount:state.vehicle.discount||0,taxRate:state.vehicle.taxRate??"",vehicleCost:state.vehicle.cost||"",pack:state.vehicle.pack||"",tradeVin:state.trade.vin,tradeVehicle:state.trade.vehicle,tradeAllowance:state.trade.allowance||"",tradeAcv:state.trade.acv||"",tradePayoff:state.trade.payoff||"",cashDown:state.trade.cashDown||"",equityCashBack:state.trade.equityCashBack||0,docFee:state.fees.doc.amount,regFee:state.fees.reg.amount,acqFee:state.fees.acq.amount,miscFee:state.fees.misc.amount,managerNotes:state.notes};Object.entries(map).forEach(([id,v])=>{if($(id))$(id).value=v});$("equityMethod").value=state.trade.equityMethod;$("docTreatment").value=state.fees.doc.treatment;$("regTreatment").value=state.fees.reg.treatment;$("acqTreatment").value=state.fees.acq.treatment;$("miscTreatment").value=state.fees.misc.treatment;$("showPaymentComparison").checked=state.presentation.showPaymentComparison!==false;$("combineDiscountIncentives").checked=Boolean(state.presentation.combineDiscountIncentives);$("showSignature").checked=Boolean(state.presentation.showSignature);populateSalespeople();$("salesperson").value=state.customer.salesperson||"";updateComputed();updateClientHistoryDisplays();}
function updateComputed(){readFormToState();const selling=Math.max(0,state.vehicle.msrp-state.vehicle.discount),equity=state.trade.allowance-state.trade.payoff,gross=state.trade.allowance-state.trade.acv;$("sellingPriceDisplay").textContent=money.format(selling);$("tradeEquityDisplay").textContent=money.format(equity);$("tradeGrossDisplay").textContent=money.format(gross);$("equityCashBackWrap").classList.toggle("hidden",state.trade.equityMethod!=="split");renderIncentives();renderScenarios();renderWorksheet();}
function mileageAdjustment(m){return ({7500:4,10000:3,12000:2,15000:0})[Number(m)]||0;}
function dealIncentives(type){return state.incentives.filter(i=>i.amount>0&&(i.appliesTo==="all"||i.appliesTo===type)).reduce((s,i)=>s+num(i.amount),0);}
function feeTotals(type){const rows=[["Document Fee",state.fees.doc,true],["Registration / Title",state.fees.reg,true],["Acquisition Fee",state.fees.acq,type==="lease"],["Miscellaneous Fee",state.fees.misc,true]].filter(r=>r[2]&&r[1].treatment!=="none"&&r[1].amount>0);return {rows,cap:rows.filter(r=>r[1].treatment==="capitalize").reduce((s,r)=>s+r[1].amount,0),upfront:rows.filter(r=>r[1].treatment==="upfront").reduce((s,r)=>s+r[1].amount,0)};}
function tradeAllocation(allowance=state.trade.allowance){const equity=allowance-state.trade.payoff;let cashBack=0,cap=Math.max(0,equity);if(state.trade.equityMethod==="cashback"){cashBack=Math.max(0,equity);cap=0}else if(state.trade.equityMethod==="split"){cashBack=Math.min(Math.max(0,state.trade.equityCashBack),Math.max(0,equity));cap=Math.max(0,equity-cashBack)}return {equity,cashBack,cap};}
function validateScenario(s){const missing=[];if(!state.vehicle.msrp)missing.push("MSRP");if(state.vehicle.taxRate===null)missing.push("tax rate");if(s.type==="lease"){if(!s.term)missing.push("term");if(!s.miles)missing.push("mileage");if(s.residual===""||s.residual==null)missing.push("residual");if(s.baseMoneyFactor===""||s.baseMoneyFactor==null)missing.push("base money factor");if(s.moneyFactor===""||s.moneyFactor==null)missing.push("used money factor")}if(s.type==="finance"){if(!s.term)missing.push("term");if(s.buyApr===""||s.buyApr==null)missing.push("buy APR");if(s.apr===""||s.apr==null)missing.push("used APR")}if(s.type==="select"){if(!s.term)missing.push("term");if(s.buyApr===""||s.buyApr==null)missing.push("buy APR");if(s.apr===""||s.apr==null)missing.push("used APR");if(s.balloon===""||s.balloon==null)missing.push("balloon %")}return missing;}
function calcScenario(s,override={}){const missing=validateScenario(s);if(missing.length)return {ready:false,missing};const msrp=state.vehicle.msrp,discount=override.discount??state.vehicle.discount,selling=Math.max(0,msrp-discount+s.priceAdjustment-dealIncentives(s.type)-s.extraIncentive),cash=Math.max(0,override.cashDown??state.trade.cashDown+s.cashAdjustment),allowance=Math.max(0,override.tradeAllowance??state.trade.allowance+s.tradeAdjustment),tax=state.vehicle.taxRate/100,fees=feeTotals(s.type),trade=tradeAllocation(allowance);
if(s.type==="lease"){const adjustedPct=num(s.residual)+mileageAdjustment(s.miles),inceptionDed=Math.max(0,num(s.inceptionMileage)-500)*num(s.inceptionCharge),customDed=num(s.customMiles)*num(s.customCharge),residualValue=Math.max(0,msrp*adjustedPct/100-inceptionDed-customDed),capCost=selling+fees.cap+Math.max(0,-trade.equity)-trade.cap-cash,usedMf=Math.max(0,num(s.moneyFactor)-(s.onePay?num(s.onePayReduction):0)),base=((capCost-residualValue)/s.term)+((capCost+residualValue)*usedMf),payment=base*(1+tax),taxOnCash=cash*tax,standardDue=payment+fees.upfront+cash+taxOnCash,onePay=payment*s.term+fees.upfront+cash+taxOnCash;return {ready:true,payment,dueUpfront:s.onePay?onePay:standardDue,onePayTotal:onePay,equivalentMonthly:payment,residualValue,adjustedResidualPct:adjustedPct,usedMf,baseMf:num(s.baseMoneyFactor),capCost,fees,taxOnCash,incentives:dealIncentives(s.type)+s.extraIncentive,selling,trade};}
const taxable=Math.max(0,selling-allowance),salesTax=taxable*tax,principal=selling+salesTax+fees.cap+fees.upfront+state.trade.payoff-allowance-cash;if(s.type==="cash")return {ready:true,payment:Math.max(0,principal),dueUpfront:Math.max(0,principal),salesTax,fees,incentives:dealIncentives(s.type)+s.extraIncentive,selling,trade};if(s.type==="finance"){const r=num(s.apr)/100/12,payment=r===0?principal/s.term:principal*r/(1-Math.pow(1+r,-s.term));return {ready:true,payment,dueUpfront:cash,amountFinanced:principal,salesTax,fees,incentives:dealIncentives(s.type)+s.extraIncentive,selling,trade};}const balloon=msrp*num(s.balloon)/100,r=num(s.apr)/100/12,payment=r===0?(principal-balloon)/s.term:(principal-balloon/Math.pow(1+r,s.term))*r/(1-Math.pow(1+r,-s.term));return {ready:true,payment,dueUpfront:cash,amountFinanced:principal,finalPayment:balloon,salesTax,fees,incentives:dealIncentives(s.type)+s.extraIncentive,selling,trade};}
function defaultScenario(type){const base={id:crypto.randomUUID(),name:"",type:type==="onepay"?"lease":type,selected:false,term:type==="cash"?1:(type==="lease"||type==="onepay"?36:60),miles:type==="lease"||type==="onepay"?10000:"",residual:"",baseMoneyFactor:"",moneyFactor:"",onePay:type==="onepay",onePayReduction:.00080,inceptionMileage:0,inceptionCharge:.20,customMiles:0,customCharge:.20,buyApr:"",apr:"",balloon:"",priceAdjustment:0,cashAdjustment:0,tradeAdjustment:0,extraIncentive:0,showRate:false,showResidual:false,showFees:true,programId:""};base.name=type==="onepay"?"One-Pay Lease 10K":type==="lease"?"Lease 10K":type==="finance"?"Finance 60":type==="cash"?"Cash Purchase":"BMW Select 60";return base;}
function renderIncentives(){const c=$("incentiveRows");c.innerHTML=state.incentives.length?state.incentives.map(i=>`<div class="incentive-row"><input value="${esc(i.name)}" data-i="${i.id}" data-f="name"><input type="number" value="${i.amount}" data-i="${i.id}" data-f="amount"><select data-i="${i.id}" data-f="appliesTo">${["all","lease","finance","cash","select"].map(v=>`<option value="${v}" ${i.appliesTo===v?"selected":""}>${v==="all"?"All Types":v}</option>`).join("")}</select><select data-i="${i.id}" data-f="category">${["customer","dealer","rate"].map(v=>`<option value="${v}" ${i.category===v?"selected":""}>${v}</option>`).join("")}</select><input value="${esc(i.programCode)}" placeholder="Program code" data-i="${i.id}" data-f="programCode"><button class="danger" data-remove-incentive="${i.id}">Remove</button></div>`).join(""):'<div class="empty-state">No incentives entered.</div>';$("incentiveTotal").textContent=money.format(state.incentives.reduce((s,i)=>s+num(i.amount),0));}
function renderScenarios(){const c=$("scenarioGrid");c.innerHTML=state.scenarios.length?state.scenarios.map(s=>{const r=calcScenario(s),label=s.type==="lease"?"LEASE":s.type==="finance"?"FINANCE":s.type==="cash"?"CASH":"BMW SELECT",amount=r.ready?money.format(s.onePay?r.onePayTotal:r.payment):"Incomplete",paylabel=s.type==="cash"?"TOTAL CASH DUE":s.onePay?"TOTAL ONE-PAY":"PER MONTH",status=r.ready?'<span class="status-ready">Ready</span>':`<span class="status-missing">Missing: ${esc(r.missing.join(", "))}</span>`;return `<article class="scenario-card ${s.type}"><div class="card-title">${label}</div><div class="card-body"><label class="check"><input type="checkbox" data-select-scenario="${s.id}" ${s.selected?"checked":""}> Present</label><h3>${esc(s.name)}</h3><div class="scenario-payment">${amount}</div><div class="payment-label">${paylabel}</div>${status}<div class="card-actions"><button data-edit-scenario="${s.id}">Edit</button><button data-duplicate-scenario="${s.id}">Duplicate</button><button data-rename-scenario="${s.id}">Rename</button><button data-delete-scenario="${s.id}">Delete</button></div></div></article>`}).join(""):'<div class="empty-state">No scenarios. Use Add Scenario.</div>';const selected=state.scenarios.filter(s=>s.selected).length;$("scenarioSelectionCount").textContent=`${selected} of 3 selected`;$("rollerScenario").innerHTML=state.scenarios.filter(s=>s.type!=="cash").map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");renderQuote();}
function renderQuote(){
 readFormToState();
 const selected=state.scenarios.filter(s=>s.selected).filter(s=>calcScenario(s).ready).slice(0,3);
 const name=[state.customer.firstName,state.customer.lastName].filter(Boolean).join(" ");
 const vehicle=[state.vehicle.year,state.vehicle.make,state.vehicle.model].filter(Boolean).join(" ");
 $("quoteHeader").innerHTML=`<div><strong>${esc(name||"Customer")}</strong><div class="item-meta">${esc(vehicle||"Vehicle")}</div></div><div><strong>MSRP ${money.format(state.vehicle.msrp)}</strong><div class="item-meta">Dealer Discount ${money.format(state.vehicle.discount)}</div></div>`;

 $("quoteCards").innerHTML=selected.length?selected.map(s=>{
   const r=calcScenario(s);
   const amount=s.onePay?r.onePayTotal:r.payment;
   const label=s.type==="cash"?"TOTAL CASH DUE":s.onePay?"TOTAL ONE-PAY":"PER MONTH";
   const scenarioIncentives=r.incentives||0;
   const lines=[["MSRP / Market Value",money.format(state.vehicle.msrp)]];

   if(state.presentation.combineDiscountIncentives){
     lines.push(["Total Discount & Incentives",money.format(state.vehicle.discount+scenarioIncentives)]);
   }else{
     lines.push(["Dealer Discount",money.format(state.vehicle.discount)]);
     lines.push(["Incentives",money.format(scenarioIncentives)]);
   }

   lines.push(
     ["Adjusted Price",money.format(r.selling)],
     ["Trade Allowance",money.format(state.trade.allowance)],
     ["Trade Payoff",money.format(state.trade.payoff)],
     ["Cash Up Front",money.format(state.trade.cashDown)]
   );

   if(s.showRate&&s.type==="lease")lines.push(["Money Factor",String(r.usedMf.toFixed(5))]);
   if(s.showRate&&["finance","select"].includes(s.type))lines.push(["APR",num(s.apr).toFixed(2)+"%"]);
   if(s.showResidual&&s.type==="lease")lines.push(["Adjusted Residual",r.adjustedResidualPct.toFixed(2)+"%"],["Residual Value",money.format(r.residualValue)]);
   if(s.showResidual&&s.type==="select")lines.push(["Final Balloon Payment",money.format(r.finalPayment)]);
   if(s.onePay)lines.unshift(["Equivalent Monthly",money.format(r.equivalentMonthly)]);
   if(s.showFees&&s.type==="lease")r.fees.rows.filter(x=>x[1].treatment==="upfront").forEach(x=>lines.push([x[0],money.format(x[1].amount)]));
   lines.push(["Total Due Up Front",money.format(r.dueUpfront)]);

   let comparison="";
   if(state.presentation.showPaymentComparison&&state.customer.currentPayment>0&&s.type!=="cash"){
     const d=r.payment-state.customer.currentPayment;
     comparison=`<div class="result-box">${d<=0?"Payment reduction":"Payment increase"} ${money.format(Math.abs(d))}</div>`;
   }

   return `<article class="quote-card ${s.type}"><div class="card-title">${esc(s.name)}</div><div class="quote-payment">${money.format(amount)}</div><div class="payment-label">${label}</div>${comparison}<div class="quote-lines">${lines.map(x=>`<div class="quote-line"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("")}</div></article>`;
 }).join(""):'<div class="empty-state">Select up to three complete scenarios in Deal Builder.</div>';

 $("signatureArea").classList.toggle("hidden",!state.presentation.showSignature);
 $("signatureArea").innerHTML=`<p>${esc(settings().disclaimer)}</p><p>Client Signature: ______________________________</p><p>Co-Buyer Signature: ___________________________</p><p>Date: ________________________________________</p>`;
}
function renderWorksheet(){
 readFormToState();
 const name=[state.customer.firstName,state.customer.lastName].filter(Boolean).join(" ");
 const vehicle=[state.vehicle.year,state.vehicle.make,state.vehicle.model].filter(Boolean).join(" ");
 const selling=Math.max(0,state.vehicle.msrp-state.vehicle.discount);
 const front=selling-state.vehicle.cost-state.vehicle.pack;
 const tradeGross=state.trade.allowance-state.trade.acv;
 const scenarios=state.scenarios.map(s=>[s,calcScenario(s)]).filter(x=>x[1].ready);
 const totalIncentives=state.incentives.reduce((sum,item)=>sum+num(item.amount),0);
 const incentiveLines=state.incentives.length
   ? state.incentives.map(item=>{
       const applies=item.appliesTo==="all"?"All Types":item.appliesTo==="select"?"BMW Select":item.appliesTo.charAt(0).toUpperCase()+item.appliesTo.slice(1);
       const code=item.programCode?` · ${esc(item.programCode)}`:"";
       return `<div class="worksheet-line"><span>${esc(item.name||"Unnamed Incentive")}<small> (${esc(applies)}${code})</small></span><strong>${money.format(num(item.amount))}</strong></div>`;
     }).join("")+`<div class="worksheet-line worksheet-total"><span>Total Incentives Entered</span><strong>${money.format(totalIncentives)}</strong></div>`
   : '<div class="item-meta">No incentives entered.</div>';

 const upfrontBlocks=scenarios.map(([s,r])=>{
   const lines=[];
   if(s.type==="lease"){
     if(s.onePay)lines.push(["One-Pay Lease Total",money.format(r.onePayTotal)]);
     else lines.push(["First Payment",money.format(r.payment)]);
     r.fees.rows.filter(x=>x[1].treatment==="upfront").forEach(x=>lines.push([x[0],money.format(x[1].amount)]));
     if(state.trade.cashDown>0)lines.push(["Cash Up Front",money.format(state.trade.cashDown)]);
     if(r.taxOnCash>0)lines.push(["Tax on Cash Reduction",money.format(r.taxOnCash)]);
   }else if(s.type==="cash"){
     lines.push(["Total Cash Due",money.format(r.dueUpfront)]);
   }else{
     if(state.trade.cashDown>0)lines.push(["Cash Up Front",money.format(state.trade.cashDown)]);
     r.fees.rows.filter(x=>x[1].treatment==="upfront").forEach(x=>lines.push([x[0],money.format(x[1].amount)]));
   }
   lines.push(["Total Due Up Front",money.format(r.dueUpfront)]);
   return `<div class="upfront-scenario"><h4>${esc(s.name)}</h4>${lines.map(x=>ws(x[0],x[1])).join("")}</div>`;
 }).join("");

 $("worksheetOutput").innerHTML=
   `<h2>BMW QUOTE WORKSHEET</h2><div class="worksheet-grid">
      <div class="worksheet-block"><h3>Customer / Vehicle</h3>
        ${ws("Client",name)}${ws("Email",state.customer.email)}${ws("Phone",state.customer.phone)}
        ${ws("Co-Buyer",[state.customer.coFirstName,state.customer.coLastName].filter(Boolean).join(" "))}
        ${ws("Salesperson",state.customer.salesperson)}${ws("Stock",state.vehicle.stockNumber)}
        ${ws("VIN",state.vehicle.vin)}${ws("Vehicle",vehicle)}
      </div>
      <div class="worksheet-block"><h3>Pricing</h3>
        ${ws("MSRP",money.format(state.vehicle.msrp))}${ws("Dealer Discount",money.format(state.vehicle.discount))}
        ${ws("Selling Price",money.format(selling))}${ws("Vehicle Cost",money.format(state.vehicle.cost))}
        ${ws("Pack",money.format(state.vehicle.pack))}${ws("Front Gross",money.format(front))}
        ${ws("Customer Quote Display",state.presentation.combineDiscountIncentives?"Discount and incentives combined":"Discount and incentives itemized")}
      </div>
      <div class="worksheet-block"><h3>Trade</h3>
        ${ws("Allowance",money.format(state.trade.allowance))}${ws("ACV",money.format(state.trade.acv))}
        ${ws("Payoff",money.format(state.trade.payoff))}${ws("Equity",money.format(state.trade.allowance-state.trade.payoff))}
        ${ws("Trade Gross",money.format(tradeGross))}${ws("Equity Treatment",state.trade.equityMethod)}
      </div>
      <div class="worksheet-block"><h3>Incentives</h3>${incentiveLines}</div>
      <div class="worksheet-block"><h3>Scenarios</h3>
        ${scenarios.map(([s,r])=>`<div class="worksheet-line"><span>${esc(s.name)}<small> · Incentives ${money.format(r.incentives||0)}</small></span><strong>${money.format(s.onePay?r.onePayTotal:r.payment)}</strong></div>`).join("")||"No complete scenarios"}
      </div>
      <div class="worksheet-block"><h3>Programs / Rates</h3>
        ${scenarios.map(([s,r])=>`<div class="rate-scenario"><strong>${esc(s.name)}</strong>${
          s.type==="lease"
          ? ws("Base / Buy MF",num(s.baseMoneyFactor).toFixed(5))+ws("Used / Customer MF",num(s.moneyFactor).toFixed(5))+ws("MF Markup",(num(s.moneyFactor)-num(s.baseMoneyFactor)).toFixed(5))+ws("Adjusted Residual",r.adjustedResidualPct.toFixed(2)+"%")
          : s.type==="finance"||s.type==="select"
          ? ws("Buy APR",num(s.buyApr).toFixed(2)+"%")+ws("Used / Customer APR",num(s.apr).toFixed(2)+"%")+ws("Rate Markup",(num(s.apr)-num(s.buyApr)).toFixed(2)+"%")+(s.type==="select"?ws("Balloon",num(s.balloon).toFixed(2)+"%"):"")
          : ws("Type","Cash Purchase")
        }</div>`).join("")}
      </div>
      <div class="worksheet-block full-width"><h3>Due Up Front Breakdown</h3><div class="upfront-grid">${upfrontBlocks||"No complete scenarios"}</div></div>
      <div class="worksheet-block"><h3>Profit / Notes</h3>
        ${ws("Front Gross",money.format(front))}${ws("Trade Gross",money.format(tradeGross))}
        ${ws("Reserve Share",settings().reserveShare+"%")}<p>${esc(state.notes||"")}</p>
      </div>
    </div>`;
}
function ws(a,b){return `<div class="worksheet-line"><span>${esc(a)}</span><strong>${esc(b||"—")}</strong></div>`}
function openScenario(s=null){const type=s?s.type:$("scenarioTemplate").value,s2=s?structuredClone(s):defaultScenario(type);$("scenarioId").value=s2.id;$("scenarioName").value=s2.name;$("scenarioType").value=s2.type;$("scenarioProgram").innerHTML='<option value="">None</option>'+programs().map(p=>`<option value="${p.id}">${esc(p.month+" · "+p.year+" "+p.model)}</option>`).join("");$("scenarioProgram").value=s2.programId||"";$("scenarioOnePay").checked=s2.onePay;$("scenarioTerm").value=s2.term;$("scenarioMiles").value=s2.miles;$("scenarioResidual").value=s2.residual;$("scenarioBaseMf").value=s2.baseMoneyFactor??"";$("scenarioMf").value=s2.moneyFactor;$("scenarioOnePayReduction").value=s2.onePayReduction;$("scenarioInceptionMileage").value=s2.inceptionMileage;$("scenarioInceptionCharge").value=s2.inceptionCharge;$("scenarioCustomMiles").value=s2.customMiles;$("scenarioCustomCharge").value=s2.customCharge;$("scenarioBuyApr").value=s2.buyApr??"";$("scenarioApr").value=s2.apr;$("scenarioBalloon").value=s2.balloon;$("scenarioPriceAdjustment").value=s2.priceAdjustment;$("scenarioCashAdjustment").value=s2.cashAdjustment;$("scenarioTradeAdjustment").value=s2.tradeAdjustment;$("scenarioExtraIncentive").value=s2.extraIncentive;$("scenarioShowRate").checked=s2.showRate;$("scenarioShowResidual").checked=s2.showResidual;$("scenarioShowFees").checked=s2.showFees;updateScenarioFields();updateScenarioPreview();$("scenarioDialog").showModal();}
function updateScenarioFields(){const t=$("scenarioType").value;document.querySelectorAll(".lease-field").forEach(e=>e.classList.toggle("hidden",t!=="lease"));document.querySelectorAll(".rate-field").forEach(e=>e.classList.toggle("hidden",!["finance","select"].includes(t)));document.querySelectorAll(".select-field").forEach(e=>e.classList.toggle("hidden",t!=="select"));document.querySelectorAll(".term-field").forEach(e=>e.classList.toggle("hidden",t==="cash"));}
function scenarioFromDialog(){return {id:$("scenarioId").value||crypto.randomUUID(),name:$("scenarioName").value.trim()||"Scenario",type:$("scenarioType").value,programId:$("scenarioProgram").value,onePay:$("scenarioOnePay").checked,term:num($("scenarioTerm").value),miles:$("scenarioMiles").value?num($("scenarioMiles").value):"",residual:$("scenarioResidual").value===""?"":num($("scenarioResidual").value),baseMoneyFactor:$("scenarioBaseMf").value===""?"":num($("scenarioBaseMf").value),moneyFactor:$("scenarioMf").value===""?"":num($("scenarioMf").value),onePayReduction:num($("scenarioOnePayReduction").value),inceptionMileage:num($("scenarioInceptionMileage").value),inceptionCharge:num($("scenarioInceptionCharge").value),customMiles:num($("scenarioCustomMiles").value),customCharge:num($("scenarioCustomCharge").value),buyApr:$("scenarioBuyApr").value===""?"":num($("scenarioBuyApr").value),apr:$("scenarioApr").value===""?"":num($("scenarioApr").value),balloon:$("scenarioBalloon").value===""?"":num($("scenarioBalloon").value),priceAdjustment:num($("scenarioPriceAdjustment").value),cashAdjustment:num($("scenarioCashAdjustment").value),tradeAdjustment:num($("scenarioTradeAdjustment").value),extraIncentive:num($("scenarioExtraIncentive").value),showRate:$("scenarioShowRate").checked,showResidual:$("scenarioShowResidual").checked,showFees:$("scenarioShowFees").checked,selected:state.scenarios.find(s=>s.id===$("scenarioId").value)?.selected||false};}
function updateScenarioPreview(){const old=state.scenarios.findIndex(s=>s.id===$("scenarioId").value),draft=scenarioFromDialog();if(old>=0)state.scenarios[old]=draft;else state.scenarios.push(draft);const r=calcScenario(draft);$("scenarioPreview").textContent=r.ready?(draft.onePay?`One-Pay ${money.format(r.onePayTotal)} · Equivalent ${money.format(r.equivalentMonthly)}`:`Estimated ${money.format(r.payment)}`):"Missing: "+r.missing.join(", ");if(old>=0)state.scenarios[old]=draft;else state.scenarios.pop();}
async function decodeVin(target){const id=target==="trade"?"tradeVin":"vin",vin=$(id).value.trim().toUpperCase();if(vin.length!==17){toast("Enter a 17-character VIN.");return}try{const res=await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/"+encodeURIComponent(vin)+"?format=json"),data=await res.json(),r=data.Results?.[0];if(target==="trade")$("tradeVehicle").value=[r.ModelYear,r.Make,r.Model,r.Trim].filter(Boolean).join(" ");else{$("year").value=r.ModelYear||"";$("make").value=r.Make||"BMW";$("model").value=[r.Model,r.Trim].filter(Boolean).join(" ")}updateComputed();toast("VIN decoded.")}catch(e){toast("VIN decoding failed.")}}
function rollPayment(){readFormToState();const s=state.scenarios.find(x=>x.id===$("rollerScenario").value),target=num($("rollerTarget").value),variable=$("rollerVariable").value,out=$("rollerResult");if(!s||target<=0){out.textContent="Choose a scenario and target payment.";out.className="result-box error";return}const r0=calcScenario(s);if(!r0.ready){out.textContent="Complete the scenario first: "+r0.missing.join(", ");out.className="result-box error";return}let low=0,high=Math.max(state.vehicle.msrp*2,100000),best=null;for(let i=0;i<100;i++){const mid=(low+high)/2,o={};o[variable]=mid;const r=calcScenario(s,o);if(!r.ready)break;best={value:mid,payment:r.payment};if(Math.abs(r.payment-target)<.01)break;if(r.payment>target)low=mid;else high=mid}const current=variable==="discount"?state.vehicle.discount:variable==="cashDown"?state.trade.cashDown:state.trade.allowance,label=variable==="discount"?"Required dealer discount":variable==="cashDown"?"Required cash up front":"Required trade allowance";out.innerHTML=`<strong>${label}: ${money.format(best.value)}</strong><br>Change: ${best.value-current>=0?"+":"−"}${money.format(Math.abs(best.value-current))} · Payment ${money.format(best.payment)}`;out.className="result-box success";}
function normalizeClientText(value){return String(value||"").trim().toLowerCase().replace(/\s+/g," ")}
function findMatchingClient(deals){
 const email=normalizeClientText(state.customer.email);
 const phone=String(state.customer.phone||"").replace(/\D/g,"");
 const first=normalizeClientText(state.customer.firstName);
 const last=normalizeClientText(state.customer.lastName);
 return deals.find(d=>{
   const c=d.customer||{};
   if(email&&normalizeClientText(c.email)===email)return true;
   if(phone&&String(c.phone||"").replace(/\D/g,"")===phone)return true;
   return first&&last&&normalizeClientText(c.firstName)===first&&normalizeClientText(c.lastName)===last;
 });
}
function updateClientHistoryDisplays(){
 const deals=localDeals();
 const match=findMatchingClient(deals);
 if(!state.customer.clientId&&match?.customer?.clientId)state.customer.clientId=match.customer.clientId;
 const clientId=state.customer.clientId;
 const count=clientId?deals.filter(d=>d.customer?.clientId===clientId).length:0;
 $("clientRecordDisplay").textContent=clientId?clientId.slice(0,8)+"…":"New client";
 $("priorQuoteCountDisplay").textContent=String(count);
}
function hasMeaningfulDraft(){
 return Boolean(
   state.customer.firstName||state.customer.lastName||state.customer.email||state.customer.phone||
   state.vehicle.stockNumber||state.vehicle.vin||state.vehicle.model||state.vehicle.msrp||
   state.trade.allowance||state.incentives.length||state.scenarios.some(s=>validateScenario(s).length===0)
 );
}
function setAutosaveStatus(message,kind=""){
 const el=$("autosaveStatus");
 if(!el)return;
 el.textContent=message;
 el.className="autosave-status"+(kind?" "+kind:"");
}
function saveDraftNow(){
 try{
   readFormToState();
   if(!hasMeaningfulDraft()){
     localStorage.removeItem(KEYS.draft);
     setAutosaveStatus("Draft empty");
     return;
   }
   const draft={deal:state,savedAt:new Date().toISOString()};
   localStorage.setItem(KEYS.draft,JSON.stringify(draft));
   setAutosaveStatus("Draft saved "+new Date(draft.savedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}),"saved");
 }catch(error){
   setAutosaveStatus("Draft save failed","error");
 }
}
function scheduleAutosave(){
 setAutosaveStatus("Saving draft…","saving");
 clearTimeout(autosaveTimer);
 autosaveTimer=setTimeout(saveDraftNow,700);
}
function restoreAutosaveDraft(){
 try{
   const raw=localStorage.getItem(KEYS.draft);
   if(!raw)return false;
   const draft=JSON.parse(raw);
   if(!draft?.deal)return false;
   state=draft.deal;
   autosaveRestored=true;
   writeStateToForm();
   renderIncentives();
   renderScenarios();
   setAutosaveStatus("Draft restored from "+new Date(draft.savedAt).toLocaleString(),"restored");
   return true;
 }catch(error){
   localStorage.removeItem(KEYS.draft);
   return false;
 }
}
function clearAutosaveDraft(){
 localStorage.removeItem(KEYS.draft);
 setAutosaveStatus("No unsaved draft");
}
async function saveDeal(){readFormToState();state.updatedAt=new Date().toISOString();let rows=localDeals();const clientMatch=findMatchingClient(rows);if(!state.customer.clientId)state.customer.clientId=clientMatch?.customer?.clientId||crypto.randomUUID();let idx=rows.findIndex(d=>d.id===state.id);if(idx>=0)rows[idx]=structuredClone(state);else rows.unshift(structuredClone(state));saveLocalDeals(rows);if(supabaseClient&&currentUser){const result=await supabaseClient.from("v3_deals").upsert({id:state.id,user_id:currentUser.id,quote_number:state.quoteNumber,client_name:[state.customer.firstName,state.customer.lastName].filter(Boolean).join(" "),vehicle:[state.vehicle.year,state.vehicle.make,state.vehicle.model].filter(Boolean).join(" "),deal_data:state,updated_at:state.updatedAt});if(result.error){toast("Saved locally. Supabase: "+result.error.message);return}}clearAutosaveDraft();toast("Deal saved.");updateClientHistoryDisplays();renderDashboard();}
async function loadAllDeals(){let rows=localDeals();if(supabaseClient&&currentUser){const r=await supabaseClient.from("v3_deals").select("*").order("updated_at",{ascending:false});if(!r.error&&r.data?.length)rows=r.data.map(x=>x.deal_data)}return rows.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));}
async function renderDashboard(){const rows=await loadAllDeals(),c=$("dashboardRecent");c.innerHTML=rows.slice(0,8).map(d=>savedCard(d)).join("")||'<div class="empty-state">No saved deals yet.</div>';}
async function renderSaved(){
 const rows=await loadAllDeals();
 const groups=new Map();
 rows.forEach(d=>{
   const key=d.customer?.clientId||normalizeClientText((d.customer?.firstName||"")+"|"+(d.customer?.lastName||""));
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(d);
 });
 $("savedDealsList").innerHTML=[...groups.values()].map(deals=>{
   const latest=deals[0];
   const name=[latest.customer.firstName,latest.customer.lastName].filter(Boolean).join(" ")||"Unnamed Client";
   const contact=[latest.customer.email,latest.customer.phone].filter(Boolean).join(" · ");
   return `<section class="client-group"><div class="client-group-header"><div><strong>${esc(name)}</strong><div class="item-meta">${esc(contact)} · ${deals.length} quote${deals.length===1?"":"s"}</div></div></div><div class="client-quote-list">${deals.map(d=>savedCard(d,true)).join("")}</div></section>`;
 }).join("")||'<div class="empty-state">No saved deals yet.</div>';
}
function savedCard(d,full=false){const name=[d.customer.firstName,d.customer.lastName].filter(Boolean).join(" ")||"Unnamed Client",vehicle=[d.vehicle.year,d.vehicle.make,d.vehicle.model].filter(Boolean).join(" ")||"Vehicle";return `<div class="${full?"saved-item":"recent-item"}"><div><strong>${esc(name)}</strong><div class="item-meta">${esc(vehicle)} · ${esc(d.quoteNumber)} · ${new Date(d.updatedAt).toLocaleString()}</div></div><div class="button-row"><button class="secondary" data-load-deal="${d.id}">Open</button>${full?`<button class="secondary" data-duplicate-deal="${d.id}">Duplicate</button>`:""}</div></div>`}
async function loadDeal(id,duplicate=false){const rows=await loadAllDeals(),d=rows.find(x=>x.id===id);if(!d)return;state=structuredClone(d);if(duplicate){state.id=crypto.randomUUID();state.quoteNumber="Q-"+new Date().toISOString().replace(/\D/g,"").slice(0,14);state.createdAt=new Date().toISOString();state.updatedAt=state.createdAt}writeStateToForm();renderIncentives();renderScenarios();showPage("deal");toast(duplicate?"Deal duplicated.":"Deal opened.");}
function renderPrograms(){const q=$("programSearch").value.toLowerCase(),rows=programs().filter(p=>JSON.stringify(p).toLowerCase().includes(q)).sort((a,b)=>String(b.month).localeCompare(String(a.month)));$("programHistory").innerHTML=rows.map(p=>`<div class="program-item"><div><strong>${esc(p.month+" · "+p.year+" "+p.model)}</strong><div class="item-meta">${esc(p.status)} · Residual ${p.residual||"—"}% · MF ${p.moneyFactor||"—"} · Finance ${p.financeApr||"—"}% · Select ${p.selectApr||"—"}%</div></div><div class="button-row"><button class="secondary" data-edit-program="${p.id}">Edit</button><button class="secondary" data-archive-program="${p.id}">${p.status==="expired"?"Restore":"Archive"}</button></div></div>`).join("")||'<div class="empty-state">No programs saved.</div>';}
function saveProgram(){const p={id:$("programId")?.value||crypto.randomUUID(),month:$("programMonth").value,manufacturer:$("programManufacturer").value,year:num($("programYear").value),model:$("programModel").value.trim(),status:$("programStatus").value,leaseTerm:num($("programLeaseTerm").value),residual:$("programResidual").value===""?"":num($("programResidual").value),moneyFactor:$("programMf").value===""?"":num($("programMf").value),onePayReduction:num($("programOnePayReduction").value),financeApr:$("programFinanceApr").value===""?"":num($("programFinanceApr").value),financeTerm:num($("programFinanceTerm").value),selectApr:$("programSelectApr").value===""?"":num($("programSelectApr").value),selectTerm:num($("programSelectTerm").value),balloon:$("programBalloon").value===""?"":num($("programBalloon").value),programCode:$("programCode").value};if(!p.month||!p.model){toast("Program month and model are required.");return}let rows=programs(),i=rows.findIndex(x=>x.id===p.id);i>=0?rows[i]=p:rows.push(p);localStorage.setItem(KEYS.programs,JSON.stringify(rows));renderPrograms();toast("Program saved.");}
function editProgram(id){const p=programs().find(x=>x.id===id);if(!p)return;let hidden=$("programId");if(!hidden){hidden=document.createElement("input");hidden.type="hidden";hidden.id="programId";$("page-programs").appendChild(hidden)}hidden.value=p.id;[["programMonth",p.month],["programManufacturer",p.manufacturer],["programYear",p.year],["programModel",p.model],["programStatus",p.status],["programLeaseTerm",p.leaseTerm],["programResidual",p.residual],["programMf",p.moneyFactor],["programOnePayReduction",p.onePayReduction],["programFinanceApr",p.financeApr],["programFinanceTerm",p.financeTerm],["programSelectApr",p.selectApr],["programSelectTerm",p.selectTerm],["programBalloon",p.balloon],["programCode",p.programCode]].forEach(x=>$(x[0]).value=x[1]??"");}
function applyProgramToDialog(){const p=programs().find(x=>x.id===$("scenarioProgram").value),t=$("scenarioType").value;if(!p)return;if(t==="lease"){$("scenarioTerm").value=p.leaseTerm;$("scenarioResidual").value=p.residual;$("scenarioBaseMf").value=p.moneyFactor;$("scenarioMf").value=p.moneyFactor;$("scenarioOnePayReduction").value=p.onePayReduction}else if(t==="finance"){$("scenarioTerm").value=p.financeTerm;$("scenarioBuyApr").value=p.financeApr;$("scenarioApr").value=p.financeApr}else if(t==="select"){$("scenarioTerm").value=p.selectTerm;$("scenarioBuyApr").value=p.selectApr;$("scenarioApr").value=p.selectApr;$("scenarioBalloon").value=p.balloon}updateScenarioPreview();}
function loadSettingsForm(){const s=settings();$("dealerName").value=s.dealerName;$("defaultTax").value=s.defaultTax;$("reserveShare").value=s.reserveShare;$("defaultSalesperson").value=s.defaultSalesperson;$("defaultDocFee").value=s.docFee;$("defaultRegFee").value=s.regFee;$("defaultAcqFee").value=s.acqFee;$("defaultMiscFee").value=s.miscFee;$("salespeople").value=s.salespeople.join("\n");$("disclaimer").value=s.disclaimer;}
function saveSettings(){const s={dealerName:$("dealerName").value,defaultTax:num($("defaultTax").value),reserveShare:num($("reserveShare").value),defaultSalesperson:$("defaultSalesperson").value,docFee:num($("defaultDocFee").value),regFee:num($("defaultRegFee").value),acqFee:num($("defaultAcqFee").value),miscFee:num($("defaultMiscFee").value),salespeople:$("salespeople").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),disclaimer:$("disclaimer").value};localStorage.setItem(KEYS.settings,JSON.stringify(s));applySettingsToDeal(false);toast("Dealer settings saved.");}
function initializeSupabase(){const c=JSON.parse(localStorage.getItem(KEYS.connection)||"null");if(!c?.url||!c?.key)return false;supabaseClient=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,storage:localStorage,storageKey:"bqp3-auth"}});supabaseClient.auth.getSession().then(r=>{currentUser=r.data.session?.user||null;updateConnectionStatus()});supabaseClient.auth.onAuthStateChange((e,s)=>{currentUser=s?.user||null;updateConnectionStatus()});return true;}
function updateConnectionStatus(msg){$("connectionStatus").textContent=msg||(supabaseClient?(currentUser?`Connected and signed in as ${currentUser.email}`:"Connected — not signed in"):"Not connected.");}
function bindEvents(){bindNav();document.querySelectorAll("#page-deal input,#page-deal select,#page-deal textarea").forEach(e=>{e.addEventListener("input",()=>{updateComputed();scheduleAutosave()});e.addEventListener("change",()=>{updateComputed();scheduleAutosave()})});$("newDealButton").onclick=()=>{state=createEmptyDeal();applySettingsToDeal(true);state.scenarios=[defaultScenario("lease"),defaultScenario("finance"),defaultScenario("select")];state.scenarios.forEach(s=>s.selected=true);clearAutosaveDraft();writeStateToForm();showPage("deal")};$("clearDealButton").onclick=$("newDealButton").onclick;$("saveDealButton").onclick=saveDeal;$("addIncentiveButton").onclick=()=>{state.incentives.push({id:crypto.randomUUID(),name:"",amount:0,appliesTo:"all",category:"customer",programCode:""});renderIncentives();scheduleAutosave()};$("addScenarioButton").onclick=()=>openScenario(null);$("rollPaymentButton").onclick=rollPayment;$("decodeVin").onclick=()=>decodeVin("vehicle");$("decodeTradeVin").onclick=()=>decodeVin("trade");$("refreshQuote").onclick=renderQuote;$("printQuote").onclick=()=>{document.body.classList.add("print-quote");window.print();setTimeout(()=>document.body.classList.remove("print-quote"),500)};$("printWorksheet").onclick=()=>{document.body.classList.add("print-worksheet");window.print();setTimeout(()=>document.body.classList.remove("print-worksheet"),500)};$("refreshDashboard").onclick=renderDashboard;$("refreshSaved").onclick=renderSaved;$("saveSettings").onclick=saveSettings;$("saveProgram").onclick=saveProgram;$("programSearch").oninput=renderPrograms;$("copyPriorProgram").onclick=()=>{const p=programs().sort((a,b)=>String(b.month).localeCompare(String(a.month)))[0];if(p){editProgram(p.id);$("programId").value="";$("programStatus").value="carried";toast("Prior program copied. Change the month.")}};$("closeScenarioDialog").onclick=()=>$("scenarioDialog").close();$("cancelScenario").onclick=()=>$("scenarioDialog").close();$("scenarioForm").onsubmit=e=>{e.preventDefault();const s=scenarioFromDialog(),i=state.scenarios.findIndex(x=>x.id===s.id);i>=0?state.scenarios[i]=s:state.scenarios.push(s);$("scenarioDialog").close();renderScenarios();scheduleAutosave()};$("scenarioType").onchange=()=>{updateScenarioFields();updateScenarioPreview()};$("scenarioProgram").onchange=applyProgramToDialog;document.querySelectorAll("#scenarioDialog input,#scenarioDialog select").forEach(e=>e.addEventListener("input",updateScenarioPreview));$("incentiveRows").addEventListener("input",e=>{const i=state.incentives.find(x=>x.id===e.target.dataset.i);if(i){i[e.target.dataset.f]=e.target.dataset.f==="amount"?num(e.target.value):e.target.value;renderScenarios();$("incentiveTotal").textContent=money.format(state.incentives.reduce((s,x)=>s+num(x.amount),0))}});$("incentiveRows").addEventListener("click",e=>{const id=e.target.dataset.removeIncentive;if(id){state.incentives=state.incentives.filter(x=>x.id!==id);renderIncentives();renderScenarios()}});$("scenarioGrid").addEventListener("click",e=>{const id=e.target.dataset.editScenario||e.target.dataset.duplicateScenario||e.target.dataset.renameScenario||e.target.dataset.deleteScenario;if(!id)return;const s=state.scenarios.find(x=>x.id===id);if(e.target.dataset.editScenario)openScenario(s);if(e.target.dataset.duplicateScenario){const d=structuredClone(s);d.id=crypto.randomUUID();d.name+=" Copy";d.selected=false;state.scenarios.push(d);renderScenarios()}if(e.target.dataset.renameScenario){const n=prompt("Scenario name:",s.name);if(n){s.name=n;renderScenarios()}}if(e.target.dataset.deleteScenario){if(confirm(`Delete "${s.name}"?`)){state.scenarios=state.scenarios.filter(x=>x.id!==id);renderScenarios()}}});$("scenarioGrid").addEventListener("change",e=>{const id=e.target.dataset.selectScenario;if(id){if(e.target.checked&&state.scenarios.filter(x=>x.selected).length>=3){e.target.checked=false;toast("Only three scenarios can be presented.");return}state.scenarios.find(x=>x.id===id).selected=e.target.checked;renderScenarios()}});document.body.addEventListener("click",e=>{if(e.target.dataset.loadDeal)loadDeal(e.target.dataset.loadDeal);if(e.target.dataset.duplicateDeal)loadDeal(e.target.dataset.duplicateDeal,true);if(e.target.dataset.editProgram)editProgram(e.target.dataset.editProgram);if(e.target.dataset.archiveProgram){let rows=programs(),p=rows.find(x=>x.id===e.target.dataset.archiveProgram);p.status=p.status==="expired"?"confirmed":"expired";localStorage.setItem(KEYS.programs,JSON.stringify(rows));renderPrograms()}});$("saveConnection").onclick=()=>{localStorage.setItem(KEYS.connection,JSON.stringify({url:$("supabaseUrl").value.trim(),key:$("supabaseKey").value.trim()}));initializeSupabase();updateConnectionStatus("Connection saved.")};$("testConnection").onclick=async()=>{if(!supabaseClient&&!initializeSupabase()){updateConnectionStatus("Enter and save connection details.");return}const r=await supabaseClient.auth.getSession();updateConnectionStatus(r.error?r.error.message:"Connection works.")};$("createAccount").onclick=async()=>{if(!supabaseClient&&!initializeSupabase())return;const r=await supabaseClient.auth.signUp({email:$("authEmail").value,password:$("authPassword").value});updateConnectionStatus(r.error?r.error.message:"Account created. Check email if confirmation is enabled.")};$("signIn").onclick=async()=>{if(!supabaseClient&&!initializeSupabase())return;const r=await supabaseClient.auth.signInWithPassword({email:$("authEmail").value,password:$("authPassword").value});updateConnectionStatus(r.error?r.error.message:"Signed in.")};$("signOut").onclick=async()=>{if(supabaseClient)await supabaseClient.auth.signOut();currentUser=null;updateConnectionStatus()};}
function init(){loadSettingsForm();const c=JSON.parse(localStorage.getItem(KEYS.connection)||"null");if(c){$("supabaseUrl").value=c.url||"";$("supabaseKey").value=c.key||"";initializeSupabase()}applySettingsToDeal(true);if(!restoreAutosaveDraft()){state.scenarios=[defaultScenario("lease"),defaultScenario("finance"),defaultScenario("select")];state.scenarios.forEach(s=>s.selected=true);writeStateToForm();setAutosaveStatus("Draft ready")}bindEvents();renderIncentives();renderScenarios();renderDashboard();renderPrograms();updateClientHistoryDisplays();$("programMonth").value=new Date().toISOString().slice(0,7);}
document.addEventListener("DOMContentLoaded",init);
})();