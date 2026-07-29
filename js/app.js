(() => {
"use strict";
const $ = id => document.getElementById(id);
const money = new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"});
const KEYS={settings:"bqp3_settings",programs:"bqp3_programs",deals:"bqp3_deals",connection:"bqp3_connection",draft:"bqp3_autosave_draft"};
let supabaseClient=null,currentUser=null,autosaveTimer=null,autosaveRestored=false,draggedScenarioId=null,importedProgramRows=[],pdfJsModulePromise=null,currentIncentiveProgramIds=[],currentProgramPickerRows=[];
let savedDealsCache=[],savedDealsLoadedAt=0,savedDealFilter="all";
let incentiveMatchCache=new Map(),currentIncentivePickerItems=[];
let state=createEmptyDeal();

function createEmptyDeal(){
 return {id:crypto.randomUUID(),quoteNumber:"Q-"+new Date().toISOString().replace(/\D/g,"").slice(0,14),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
 customer:{clientId:"",firstName:"",lastName:"",coFirstName:"",coLastName:"",email:"",phone:"",salesperson:"",currentPayment:0},
 vehicle:{stockNumber:"",vin:"",year:"",make:"BMW",model:"",msrp:0,discount:0,cost:0,pack:0,taxRate:null},
 trade:{vin:"",vehicle:"",allowance:0,acv:0,payoff:0,cashDown:0,equityMethod:"cap",equityCashBack:0},
 fees:{doc:{amount:595,treatment:"upfront"},reg:{amount:130,treatment:"upfront"},acq:{amount:925,treatment:"capitalize"},misc:{amount:0,treatment:"capitalize"}},
 incentives:[],scenarios:[],acceptedScenarioId:"",notes:"",presentation:{showPaymentComparison:true,combineDiscountIncentives:false,showSignature:false}};
}
function settings(){return JSON.parse(localStorage.getItem(KEYS.settings)||"null")||{dealerName:"BMW of Peabody",defaultTax:6.25,reserveShare:70,defaultSalesperson:"Brian Macey",docFee:595,regFee:130,acqFee:925,miscFee:0,salespeople:["Brian Macey"],disclaimer:"Figures are estimates and remain subject to credit approval, vehicle availability, final appraisal, and current manufacturer programs."};}
let programCache=JSON.parse(localStorage.getItem(KEYS.programs)||"[]");
function programs(){return programCache;}
function saveProgramsLocal(rows){
 programCache=rows;
 incentiveMatchCache.clear();
 localStorage.setItem(KEYS.programs,JSON.stringify(rows));
}
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
function incentiveAppliesTo(item,type){const a=item.appliesToTypes||item.appliesTo||"all";return Array.isArray(a)?a.includes("all")||a.includes(type):a==="all"||a===type;}
function dealIncentives(type){return state.incentives.filter(i=>num(i.amount)>0&&incentiveAppliesTo(i,type)).reduce((s,i)=>s+num(i.amount),0);}
function appliedIncentivesForType(type){return state.incentives.filter(i=>num(i.amount)>0&&incentiveAppliesTo(i,type));}
function incentiveAppliesLabel(item){const a=item.appliesToTypes||item.appliesTo||"all",v=Array.isArray(a)?a:[a],l={all:"All Types",lease:"Lease",finance:"Finance",cash:"Cash",select:"BMW Select"};return v.map(x=>l[x]||x).join(", ");}
function feeTotals(type){const rows=[["Document Fee",state.fees.doc,true],["Registration / Title",state.fees.reg,true],["Acquisition Fee",state.fees.acq,type==="lease"],["Miscellaneous Fee",state.fees.misc,true]].filter(r=>r[2]&&r[1].treatment!=="none"&&r[1].amount>0);return {rows,cap:rows.filter(r=>r[1].treatment==="capitalize").reduce((s,r)=>s+r[1].amount,0),upfront:rows.filter(r=>r[1].treatment==="upfront").reduce((s,r)=>s+r[1].amount,0)};}
function tradeAllocation(allowance=state.trade.allowance){const equity=allowance-state.trade.payoff;let cashBack=0,cap=Math.max(0,equity);if(state.trade.equityMethod==="cashback"){cashBack=Math.max(0,equity);cap=0}else if(state.trade.equityMethod==="split"){cashBack=Math.min(Math.max(0,state.trade.equityCashBack),Math.max(0,equity));cap=Math.max(0,equity-cashBack)}return {equity,cashBack,cap};}
function validateScenario(s){const missing=[];if(!state.vehicle.msrp)missing.push("MSRP");if(state.vehicle.taxRate===null)missing.push("tax rate");if(s.type==="lease"){if(!s.term)missing.push("term");if(!s.miles)missing.push("mileage");if(s.residual===""||s.residual==null)missing.push("residual");if(s.baseMoneyFactor===""||s.baseMoneyFactor==null)missing.push("base money factor");if(s.moneyFactor===""||s.moneyFactor==null)missing.push("used money factor")}if(s.type==="finance"){if(!s.term)missing.push("term");if(s.buyApr===""||s.buyApr==null)missing.push("buy APR");if(s.apr===""||s.apr==null)missing.push("used APR")}if(s.type==="select"){if(!s.term)missing.push("term");if(s.buyApr===""||s.buyApr==null)missing.push("buy APR");if(s.apr===""||s.apr==null)missing.push("used APR");if(s.balloon===""||s.balloon==null)missing.push("balloon %")}return missing;}
function calcScenario(s,override={}){const missing=validateScenario(s);if(missing.length)return {ready:false,missing};const msrp=state.vehicle.msrp,discount=override.discount??state.vehicle.discount,selling=Math.max(0,msrp-discount+s.priceAdjustment-dealIncentives(s.type)-s.extraIncentive),cash=Math.max(0,override.cashDown??state.trade.cashDown+s.cashAdjustment),allowance=Math.max(0,override.tradeAllowance??state.trade.allowance+s.tradeAdjustment),tax=state.vehicle.taxRate/100,fees=feeTotals(s.type),trade=tradeAllocation(allowance);
if(s.type==="lease"){const adjustedPct=num(s.residual)+mileageAdjustment(s.miles),inceptionDed=Math.max(0,num(s.inceptionMileage)-500)*num(s.inceptionCharge),customDed=num(s.customMiles)*num(s.customCharge),residualValue=Math.max(0,msrp*adjustedPct/100-inceptionDed-customDed),capCost=selling+fees.cap+Math.max(0,-trade.equity)-trade.cap-cash,usedMf=Math.max(0,num(s.moneyFactor)-(s.onePay?num(s.onePayReduction):0)),base=((capCost-residualValue)/s.term)+((capCost+residualValue)*usedMf),monthlyTax=base*tax,payment=base+monthlyTax,taxOnCash=cash*tax,estimatedTotalTax=monthlyTax*s.term+taxOnCash,standardDue=payment+fees.upfront+cash+taxOnCash,onePay=payment*s.term+fees.upfront+cash+taxOnCash;return {ready:true,payment,basePayment:base,monthlyTax,estimatedTotalTax,taxableAmount:base,dueUpfront:s.onePay?onePay:standardDue,onePayTotal:onePay,equivalentMonthly:payment,residualValue,adjustedResidualPct:adjustedPct,usedMf,baseMf:num(s.baseMoneyFactor),capCost,amountFinanced:capCost,fees,totalFees:fees.cap+fees.upfront,taxOnCash,incentives:dealIncentives(s.type)+s.extraIncentive,selling,trade};}
const taxable=Math.max(0,selling-allowance),salesTax=taxable*tax,principal=selling+salesTax+fees.cap+fees.upfront+state.trade.payoff-allowance-cash,totalFees=fees.cap+fees.upfront;if(s.type==="cash")return {ready:true,payment:Math.max(0,principal),dueUpfront:Math.max(0,principal),taxableAmount:taxable,amountFinanced:principal,salesTax,totalFees,fees,incentives:dealIncentives(s.type)+s.extraIncentive,selling,trade};if(s.type==="finance"){const r=num(s.apr)/100/12,payment=r===0?principal/s.term:principal*r/(1-Math.pow(1+r,-s.term));return {ready:true,payment,dueUpfront:cash,taxableAmount:taxable,amountFinanced:principal,salesTax,totalFees,fees,incentives:dealIncentives(s.type)+s.extraIncentive,selling,trade};}const balloon=msrp*num(s.balloon)/100,r=num(s.apr)/100/12,payment=r===0?(principal-balloon)/s.term:(principal-balloon/Math.pow(1+r,s.term))*r/(1-Math.pow(1+r,-s.term));return {ready:true,payment,dueUpfront:cash,taxableAmount:taxable,amountFinanced:principal,finalPayment:balloon,salesTax,totalFees,fees,incentives:dealIncentives(s.type)+s.extraIncentive,selling,trade};}
function defaultScenario(type){const base={id:crypto.randomUUID(),name:"",type:type==="onepay"?"lease":type,selected:false,term:type==="cash"?1:(type==="lease"||type==="onepay"?36:60),miles:type==="lease"||type==="onepay"?10000:"",residual:"",baseMoneyFactor:"",moneyFactor:"",onePay:type==="onepay",onePayReduction:.00080,inceptionMileage:0,inceptionCharge:.20,customMiles:0,customCharge:.20,buyApr:"",apr:"",balloon:"",priceAdjustment:0,cashAdjustment:0,tradeAdjustment:0,extraIncentive:0,showRate:false,showResidual:false,showFees:true,programId:""};base.name=type==="onepay"?"One-Pay Lease 10K":type==="lease"?"Lease 10K":type==="finance"?"Finance 60":type==="cash"?"Cash Purchase":"BMW Select 60";return base;}
function renderIncentives(){
 const c=$("incentiveRows");
 c.innerHTML=state.incentives.length?state.incentives.map(i=>`<div class="selected-incentive-row"><div><strong>${esc(i.name)}</strong><span>${esc(incentiveAppliesLabel(i))}${i.programCode?" · "+esc(i.programCode):""}</span></div><strong>${money.format(num(i.amount))}</strong><button type="button" class="danger remove-incentive-button" data-remove-incentive="${i.id}">Remove Incentive</button></div>`).join(""):'<div class="empty-state">No program incentives selected.</div>';
 $("incentiveTotal").textContent=money.format(state.incentives.reduce((s,i)=>s+num(i.amount),0));
}
function renderScenarios(){
 const c=$("scenarioGrid");
 c.innerHTML=state.scenarios.length?state.scenarios.map((s,index)=>{
   const r=calcScenario(s),label=s.type==="lease"?"LEASE":s.type==="finance"?"FINANCE":s.type==="cash"?"CASH":"BMW SELECT";
   const amount=r.ready?money.format(s.onePay?r.onePayTotal:r.payment):"Incomplete";
   const paylabel=s.type==="cash"?"TOTAL CASH DUE":s.onePay?"TOTAL ONE-PAY":"PER MONTH";
   const status=r.ready?'<span class="status-ready">Ready</span>':`<span class="status-missing">Missing: ${esc(r.missing.join(", "))}</span>`;
   const accepted=state.acceptedScenarioId===s.id;
   return `<article class="scenario-card ${s.type} ${accepted?"accepted":""}" draggable="true" data-scenario-card="${s.id}">
     <div class="card-title"><span>${label}</span><span class="drag-handle" title="Drag to reorder">↕</span></div>
     <div class="card-body">
       <div class="scenario-choice-row">
         <label class="check"><input type="checkbox" data-select-scenario="${s.id}" ${s.selected?"checked":""}> Present</label>
         <label class="check accepted-check"><input type="radio" name="acceptedScenario" data-accept-scenario="${s.id}" ${accepted?"checked":""}> Accepted Deal</label>
       </div>
       <h3>${esc(s.name)}</h3><div class="scenario-payment">${amount}</div><div class="payment-label">${paylabel}</div>${status}
       <div class="move-actions"><button data-move-scenario="${s.id}" data-direction="-1" ${index===0?"disabled":""}>← Move Left</button><button data-move-scenario="${s.id}" data-direction="1" ${index===state.scenarios.length-1?"disabled":""}>Move Right →</button></div>
       <div class="card-actions"><button data-edit-scenario="${s.id}">Edit</button><button data-duplicate-scenario="${s.id}">Duplicate</button><button data-rename-scenario="${s.id}">Rename</button><button data-delete-scenario="${s.id}">Delete</button></div>
     </div></article>`;
 }).join(""):'<div class="empty-state">No scenarios. Use Add Scenario.</div>';
 const selected=state.scenarios.filter(s=>s.selected).length;
 $("scenarioSelectionCount").textContent=`${selected} of 3 selected${state.acceptedScenarioId?" · Accepted deal selected":""}`;
 const previousRollScenario=$("rollerScenario").value;const rollScenarios=state.scenarios.filter(s=>s.type!=="cash");$("rollerScenario").innerHTML=rollScenarios.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");if(rollScenarios.some(s=>s.id===previousRollScenario))$("rollerScenario").value=previousRollScenario;
 renderQuote();
}
function moveScenario(id,direction){
 const index=state.scenarios.findIndex(s=>s.id===id),target=index+direction;
 if(index<0||target<0||target>=state.scenarios.length)return;
 const [item]=state.scenarios.splice(index,1);state.scenarios.splice(target,0,item);renderScenarios();scheduleAutosave();
}
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
     ["Trade Equity",money.format(state.trade.allowance-state.trade.payoff)],
     ["Cash Up Front",money.format(state.trade.cashDown)]
   );
   if(s.type==="lease"){
     lines.push(["Monthly Sales Tax",money.format(r.monthlyTax||0)],["Estimated Total Tax",money.format(r.estimatedTotalTax||0)],["Adjusted Cap Cost",money.format(r.capCost||0)]);
   }else{
     lines.push(["Taxable Amount",money.format(r.taxableAmount||0)],["Sales Tax",money.format(r.salesTax||0)],["Total Fees",money.format(r.totalFees||0)]);
     if(s.type!=="cash")lines.push(["Amount Financed",money.format(r.amountFinanced||0)]);
   }

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
 const accepted=state.scenarios.find(s=>s.id===state.acceptedScenarioId);
 const result=accepted?calcScenario(accepted):null;
 const acceptedIncentives=accepted?appliedIncentivesForType(accepted.type):[];
 const totalIncentives=acceptedIncentives.reduce((sum,item)=>sum+num(item.amount),0);
 const incentiveLines=acceptedIncentives.length?acceptedIncentives.map(item=>`<div class="worksheet-line"><span>${esc(item.name)}<small> (${esc(incentiveAppliesLabel(item))}${item.programCode?" · "+esc(item.programCode):""})</small></span><strong>${money.format(num(item.amount))}</strong></div>`).join("")+`<div class="worksheet-line worksheet-total"><span>Total Applied Incentives</span><strong>${money.format(totalIncentives)}</strong></div>`:'<div class="item-meta">No incentives selected.</div>';

 if(!accepted||!result?.ready){
   $("worksheetOutput").innerHTML=`<h2>BMW QUOTE WORKSHEET</h2><div class="empty-state manager-empty">Select one complete scenario as the Accepted Deal in Deal Builder. Only that scenario will appear on this worksheet.</div>`;
   return;
 }

 const upfront=[];
 if(accepted.type==="lease"){
   upfront.push([accepted.onePay?"One-Pay Lease Total":"First Payment",money.format(accepted.onePay?result.onePayTotal:result.payment)]);
   result.fees.rows.filter(x=>x[1].treatment==="upfront").forEach(x=>upfront.push([x[0],money.format(x[1].amount)]));
   if(state.trade.cashDown>0)upfront.push(["Cash Up Front",money.format(state.trade.cashDown)]);
   if(result.taxOnCash>0)upfront.push(["Tax on Cash Reduction",money.format(result.taxOnCash)]);
 }else if(accepted.type==="cash"){
   upfront.push(["Total Cash Due",money.format(result.dueUpfront)]);
 }else{
   if(state.trade.cashDown>0)upfront.push(["Cash Up Front",money.format(state.trade.cashDown)]);
   result.fees.rows.filter(x=>x[1].treatment==="upfront").forEach(x=>upfront.push([x[0],money.format(x[1].amount)]));
 }
 upfront.push(["Total Due Up Front",money.format(result.dueUpfront)]);

 const rateLines=accepted.type==="lease"
   ? ws("Base / Buy MF",num(accepted.baseMoneyFactor).toFixed(5))+ws("Used / Customer MF",num(accepted.moneyFactor).toFixed(5))+ws("MF Markup",(num(accepted.moneyFactor)-num(accepted.baseMoneyFactor)).toFixed(5))+ws("Base Residual",num(accepted.residual).toFixed(2)+"%")+ws("Adjusted Residual",result.adjustedResidualPct.toFixed(2)+"%")+ws("Residual Value",money.format(result.residualValue))
   : accepted.type==="finance"||accepted.type==="select"
   ? ws("Buy APR",num(accepted.buyApr).toFixed(2)+"%")+ws("Used / Customer APR",num(accepted.apr).toFixed(2)+"%")+ws("Rate Markup",(num(accepted.apr)-num(accepted.buyApr)).toFixed(2)+"%")+(accepted.type==="select"?ws("Balloon",num(accepted.balloon).toFixed(2)+"%")+ws("Final Balloon",money.format(result.finalPayment)):"")
   : ws("Type","Cash Purchase");

 $("worksheetOutput").innerHTML=`<h2>BMW QUOTE WORKSHEET — ACCEPTED DEAL</h2><div class="accepted-banner">${esc(accepted.name)} · ${money.format(accepted.onePay?result.onePayTotal:result.payment)} ${accepted.type==="cash"||accepted.onePay?"":"per month"}</div><div class="worksheet-grid">
   <div class="worksheet-block"><h3>Customer / Vehicle</h3>${ws("Client",name)}${ws("Email",state.customer.email)}${ws("Phone",state.customer.phone)}${ws("Co-Buyer",[state.customer.coFirstName,state.customer.coLastName].filter(Boolean).join(" "))}${ws("Salesperson",state.customer.salesperson)}${ws("Stock",state.vehicle.stockNumber)}${ws("VIN",state.vehicle.vin)}${ws("Vehicle",vehicle)}</div>
   <div class="worksheet-block"><h3>Pricing</h3>${ws("MSRP",money.format(state.vehicle.msrp))}${ws("Dealer Discount",money.format(state.vehicle.discount))}${ws("Selling Price",money.format(selling))}${ws("Applied Incentives",money.format(result.incentives||0))}${ws("Adjusted Price",money.format(result.selling))}${ws("Vehicle Cost",money.format(state.vehicle.cost))}${ws("Pack",money.format(state.vehicle.pack))}${ws("Front Gross",money.format(front))}</div>
   <div class="worksheet-block"><h3>Trade</h3>${ws("Allowance",money.format(state.trade.allowance))}${ws("ACV",money.format(state.trade.acv))}${ws("Payoff",money.format(state.trade.payoff))}${ws("Equity",money.format(state.trade.allowance-state.trade.payoff))}${ws("Trade Gross",money.format(tradeGross))}${ws("Equity Treatment",state.trade.equityMethod)}</div>
   <div class="worksheet-block"><h3>Selected Incentives</h3>${incentiveLines}</div>
   <div class="worksheet-block"><h3>Accepted Scenario</h3>${ws("Scenario",accepted.name)}${ws("Type",accepted.type)}${ws("Term",accepted.term+" months")}${accepted.type==="lease"?ws("Annual Mileage",Number(accepted.miles).toLocaleString("en-US")):""}${ws(accepted.onePay?"One-Pay Total":accepted.type==="cash"?"Cash Due":"Payment",money.format(accepted.onePay?result.onePayTotal:result.payment))}</div>
   <div class="worksheet-block"><h3>Programs / Rates</h3>${rateLines}</div>
   <div class="worksheet-block"><h3>Taxes & Fees</h3>${accepted.type==="lease"?ws("Monthly Sales Tax",money.format(result.monthlyTax||0))+ws("Estimated Total Tax",money.format(result.estimatedTotalTax||0))+ws("Tax on Cash Reduction",money.format(result.taxOnCash||0)):ws("Taxable Amount",money.format(result.taxableAmount||0))+ws("Sales Tax",money.format(result.salesTax||0))}${ws("Document Fee",money.format(state.fees.doc.amount))}${ws("Registration / Title",money.format(state.fees.reg.amount))}${accepted.type==="lease"?ws("Acquisition Fee",money.format(state.fees.acq.amount)):""}${ws("Miscellaneous Fee",money.format(state.fees.misc.amount))}${ws("Total Included Fees",money.format(result.totalFees||0))}</div>
   <div class="worksheet-block"><h3>Financing Summary</h3>${accepted.type==="lease"?ws("Adjusted Cap Cost",money.format(result.capCost||0))+ws("Base Payment Before Tax",money.format(result.basePayment||0))+ws("Amount Financed / Cap Cost",money.format(result.amountFinanced||0)):ws("Amount Financed",money.format(result.amountFinanced||0))+ws("Cash Down",money.format(state.trade.cashDown))+ws("Net Trade Equity",money.format(state.trade.allowance-state.trade.payoff))}${accepted.type==="select"?ws("Final Balloon Payment",money.format(result.finalPayment||0)):""}</div>
   <details class="worksheet-block full-width verification-block" open><summary><h3>Calculation Verification</h3></summary><div class="verification-grid">${ws("MSRP",money.format(state.vehicle.msrp))}${ws("Selling Price Before Incentives",money.format(selling))}${ws("Applied Incentives",money.format(result.incentives||0))}${ws("Adjusted Selling Price",money.format(result.selling||0))}${ws("Trade Allowance",money.format(state.trade.allowance))}${ws("Trade Payoff",money.format(state.trade.payoff))}${accepted.type==="lease"?ws("Adjusted Cap Cost",money.format(result.capCost||0))+ws("Residual Value",money.format(result.residualValue||0))+ws("Base Payment",money.format(result.basePayment||0))+ws("Monthly Tax",money.format(result.monthlyTax||0)):ws("Taxable Amount",money.format(result.taxableAmount||0))+ws("Sales Tax",money.format(result.salesTax||0))+ws("Total Fees",money.format(result.totalFees||0))+ws("Amount Financed",money.format(result.amountFinanced||0))}${accepted.type==="select"?ws("Balloon Amount",money.format(result.finalPayment||0)):""}${ws("Calculated Payment",money.format(accepted.onePay?result.onePayTotal:result.payment))}</div></details>
   <div class="worksheet-block full-width"><h3>Due Up Front Breakdown</h3><div class="upfront-scenario">${upfront.map(x=>ws(x[0],x[1])).join("")}</div></div>
   <div class="worksheet-block"><h3>Profit / Notes</h3>${ws("Front Gross",money.format(front))}${ws("Trade Gross",money.format(tradeGross))}${ws("Reserve Share",settings().reserveShare+"%")}<p>${esc(state.notes||"")}</p></div>
 </div>`;
}
function ws(a,b){return `<div class="worksheet-line"><span>${esc(a)}</span><strong>${esc(b||"—")}</strong></div>`}
function normalizeModelName(value){
 return String(value||"")
   .toLowerCase()
   .replace(/\bbmw\b/g,"")
   .replace(/\b20\d{2}\b/g,"")
   .replace(/[^a-z0-9]+/g," ")
   .replace(/\s+/g," ")
   .trim();
}

function programMatchScore(program){
 const vehicleYear=num(state.vehicle.year);
 const programYear=num(program.year);
 const vehicleModel=normalizeModelName(state.vehicle.model);
 const programModel=normalizeModelName(program.model);
 let score=0;

 if(vehicleYear&&programYear===vehicleYear)score+=100;
 else if(vehicleYear&&programYear!==vehicleYear)score-=100;

 if(vehicleModel&&programModel){
   if(programModel===vehicleModel)score+=100;
   else if(programModel.includes(vehicleModel)||vehicleModel.includes(programModel))score+=70;

   const vehicleSeries=vehicleModel.match(/\b(x[1-7]|xm|i[457x]|m[23458])\b/)?.[1];
   const programSeries=programModel.match(/\b(x[1-7]|xm|i[457x]|m[23458])\b/)?.[1];
   if(vehicleSeries&&programSeries&&vehicleSeries===programSeries)score+=35;
 }
 return score;
}

function matchingPrograms(){
 return programs()
   .filter(program=>program.status!=="expired")
   .map(program=>({program,score:programMatchScore(program)}))
   .filter(item=>item.score>0)
   .sort((a,b)=>
     b.score-a.score ||
     String(b.program.month).localeCompare(String(a.program.month)) ||
     String(a.program.model).localeCompare(String(b.program.model))
   )
   .map(item=>item.program);
}

function populateScenarioProgramOptions(selectedId=""){
 const select=$("scenarioProgram");
 const matches=matchingPrograms();
 const allActive=programs()
   .filter(program=>program.status!=="expired")
   .sort((a,b)=>String(b.month).localeCompare(String(a.month)));

 const rows=matches.length?matches:allActive;
 select.innerHTML=
   '<option value="">Choose matching program</option>'+
   rows.map(program=>{
     const matchLabel=matches.includes(program)?"Best Match · ":"";
     return `<option value="${program.id}">${matchLabel}${esc(program.month)} · ${program.year} ${esc(program.model)}${program.modelCode?" · "+esc(program.modelCode):""}</option>`;
   }).join("");

 select.value=selectedId||"";
}

function mergeProgramIncentivesIntoDeal(program){
 const existingKeys=new Set(state.incentives.map(item=>
   `${item.sourceProgramId||""}|${item.sourceIncentiveId||item.name}`
 ));
 let added=0;

 (program.incentives||[]).forEach(item=>{
   const key=`${program.id}|${item.id||item.name}`;
   if(existingKeys.has(key))return;
   state.incentives.push({
     ...item,
     id:crypto.randomUUID(),
     sourceProgramId:program.id,
     sourceIncentiveId:item.id||""
   });
   existingKeys.add(key);
   added++;
 });
 return added;
}

function applyProgramToScenarioObject(scenario,program){
 const source=structuredClone(program);
 scenario.programId=source.id;

 if(scenario.type==="lease"){
   scenario.term=num(source.leaseTerm)||scenario.term||36;
   scenario.residual=source.residual===""?"":num(source.residual);
   scenario.baseMoneyFactor=source.moneyFactor===""?"":num(source.moneyFactor);
   if(scenario.moneyFactor===""||num(scenario.moneyFactor)<num(source.moneyFactor)){
     scenario.moneyFactor=source.moneyFactor===""?"":num(source.moneyFactor);
   }
   scenario.onePayReduction=num(source.onePayReduction)||scenario.onePayReduction||.00080;
 }else if(scenario.type==="finance"){
   scenario.term=num(source.financeTerm)||scenario.term||60;
   scenario.buyApr=source.financeApr===""?"":num(source.financeApr);
   if(scenario.apr===""||num(scenario.apr)<num(source.financeApr)){
     scenario.apr=source.financeApr===""?"":num(source.financeApr);
   }
 }else if(scenario.type==="select"){
   scenario.term=num(source.selectTerm)||scenario.term||60;
   scenario.buyApr=source.selectApr===""?"":num(source.selectApr);
   if(scenario.apr===""||num(scenario.apr)<num(source.selectApr)){
     scenario.apr=source.selectApr===""?"":num(source.selectApr);
   }
   if(source.balloon!==""&&source.balloon!=null)scenario.balloon=num(source.balloon);
 }
 return scenario;
}

function applyProgramToDeal(programId,options={}){
 readFormToState();
 const program=programs().find(item=>item.id===programId);
 if(!program){
   toast("The selected program could not be found.");
   return;
 }

 if(!state.vehicle.year)state.vehicle.year=program.year;
 if(!state.vehicle.model)state.vehicle.model=program.model;

 let updated=0;
 state.scenarios.forEach(scenario=>{
   if(["lease","finance","select"].includes(scenario.type)){
     applyProgramToScenarioObject(scenario,program);
     updated++;
   }
 });

 const incentivesAdded=mergeProgramIncentivesIntoDeal(program);
 writeStateToForm();
 renderIncentives();
 renderScenarios();
 renderWorksheet();
 scheduleAutosave();

 if($("programPickerDialog")?.open)$("programPickerDialog").close();
 if(options.openDeal!==false)showPage("deal");

 toast(
   `${program.month} ${program.year} ${program.model} applied to ${updated} scenario${updated===1?"":"s"}${incentivesAdded?` and ${incentivesAdded} incentive${incentivesAdded===1?"":"s"}`:""}.`
 );
}

function openProgramPicker(){
 readFormToState();
 const all=programs().filter(program=>program.status!=="expired");
 const matches=matchingPrograms();

 const months=[...new Set(all.map(program=>program.month).filter(Boolean))]
   .sort((a,b)=>String(b).localeCompare(String(a)));
 const years=[...new Set(all.map(program=>String(program.year)).filter(Boolean))]
   .sort((a,b)=>Number(b)-Number(a));

 $("programPickerMonth").innerHTML=
   '<option value="">All Months</option>'+
   months.map(month=>`<option value="${month}">${month}</option>`).join("");
 $("programPickerYear").innerHTML=
   '<option value="">All Years</option>'+
   years.map(year=>`<option value="${year}">${year}</option>`).join("");

 if(matches.length){
   $("programPickerMonth").value=matches[0].month||"";
   $("programPickerYear").value=String(state.vehicle.year||matches[0].year||"");
 }
 $("programPickerSearch").value="";
 

 renderProgramPickerResults();
 $("programPickerDialog").showModal();
}

function renderProgramPickerResults(){
 const month=$("programPickerMonth").value;
 const year=$("programPickerYear").value;
 const query=normalizeModelName($("programPickerSearch").value);

 currentProgramPickerRows=programs()
   .filter(program=>program.status!=="expired")
   .filter(program=>!month||program.month===month)
   .filter(program=>!year||String(program.year)===year)
   .filter(program=>{
     if(!query)return true;
     const haystack=normalizeModelName(`${program.model||""} ${program.modelCode||""}`);
     return haystack.includes(query)||query.includes(haystack);
   })
   .sort((a,b)=>
     programMatchScore(b)-programMatchScore(a) ||
     String(b.month).localeCompare(String(a.month))
   );

 $("programPickerSummary").textContent=`${currentProgramPickerRows.length} program${currentProgramPickerRows.length===1?"":"s"} shown for ${year||"all years"}${month?` · ${month}`:""}${state.vehicle.model?` · ${state.vehicle.model}`:""}.`;
 $("programPickerResults").innerHTML=currentProgramPickerRows.length
   ? currentProgramPickerRows.map(program=>{
       const incentiveCount=(program.incentives||[]).length;
       return `<article class="program-pick-card">
         <div>
           <strong>${esc(program.month)} · ${program.year} ${esc(program.model)}</strong>
           <span>${esc(program.modelCode||"No model code")} · ${esc(program.status)}</span>
         </div>
         <div class="program-pick-values">
           <span>Residual <strong>${program.residual===""?"—":program.residual+"%"}</strong></span>
           <span>MF <strong>${program.moneyFactor===""?"—":program.moneyFactor}</strong></span>
           <span>Finance <strong>${program.financeApr===""?"—":program.financeApr+"%"}</strong></span>
           <span>Select <strong>${program.selectApr===""?"—":program.selectApr+"%"}</strong></span>
           <span>Incentives <strong>${incentiveCount}</strong></span>
         </div>
         <button type="button" class="primary" data-apply-program="${program.id}">Use Program</button>
       </article>`;
     }).join("")
   : '<div class="empty-state">No matching programs. Adjust the month, year or model search.</div>';
}

function openScenario(s=null){const type=s?s.type:$("scenarioTemplate").value,s2=s?structuredClone(s):defaultScenario(type);$("scenarioId").value=s2.id;$("scenarioName").value=s2.name;$("scenarioType").value=s2.type;populateScenarioProgramOptions(s2.programId||"");$("scenarioOnePay").checked=s2.onePay;$("scenarioTerm").value=s2.term;$("scenarioMiles").value=s2.miles;$("scenarioResidual").value=s2.residual;$("scenarioBaseMf").value=s2.baseMoneyFactor??"";$("scenarioMf").value=s2.moneyFactor;$("scenarioOnePayReduction").value=s2.onePayReduction;$("scenarioInceptionMileage").value=s2.inceptionMileage;$("scenarioInceptionCharge").value=s2.inceptionCharge;$("scenarioCustomMiles").value=s2.customMiles;$("scenarioCustomCharge").value=s2.customCharge;$("scenarioBuyApr").value=s2.buyApr??"";$("scenarioApr").value=s2.apr;$("scenarioBalloon").value=s2.balloon;$("scenarioPriceAdjustment").value=s2.priceAdjustment;$("scenarioCashAdjustment").value=s2.cashAdjustment;$("scenarioTradeAdjustment").value=s2.tradeAdjustment;$("scenarioExtraIncentive").value=s2.extraIncentive;$("scenarioShowRate").checked=s2.showRate;$("scenarioShowResidual").checked=s2.showResidual;$("scenarioShowFees").checked=s2.showFees;updateScenarioFields();updateScenarioPreview();$("scenarioDialog").showModal();}
function updateScenarioFields(){const t=$("scenarioType").value;document.querySelectorAll(".lease-field").forEach(e=>e.classList.toggle("hidden",t!=="lease"));document.querySelectorAll(".rate-field").forEach(e=>e.classList.toggle("hidden",!["finance","select"].includes(t)));document.querySelectorAll(".select-field").forEach(e=>e.classList.toggle("hidden",t!=="select"));document.querySelectorAll(".term-field").forEach(e=>e.classList.toggle("hidden",t==="cash"));}
function scenarioFromDialog(){return {id:$("scenarioId").value||crypto.randomUUID(),name:$("scenarioName").value.trim()||"Scenario",type:$("scenarioType").value,programId:$("scenarioProgram").value,onePay:$("scenarioOnePay").checked,term:num($("scenarioTerm").value),miles:$("scenarioMiles").value?num($("scenarioMiles").value):"",residual:$("scenarioResidual").value===""?"":num($("scenarioResidual").value),baseMoneyFactor:$("scenarioBaseMf").value===""?"":num($("scenarioBaseMf").value),moneyFactor:$("scenarioMf").value===""?"":num($("scenarioMf").value),onePayReduction:num($("scenarioOnePayReduction").value),inceptionMileage:num($("scenarioInceptionMileage").value),inceptionCharge:num($("scenarioInceptionCharge").value),customMiles:num($("scenarioCustomMiles").value),customCharge:num($("scenarioCustomCharge").value),buyApr:$("scenarioBuyApr").value===""?"":num($("scenarioBuyApr").value),apr:$("scenarioApr").value===""?"":num($("scenarioApr").value),balloon:$("scenarioBalloon").value===""?"":num($("scenarioBalloon").value),priceAdjustment:num($("scenarioPriceAdjustment").value),cashAdjustment:num($("scenarioCashAdjustment").value),tradeAdjustment:num($("scenarioTradeAdjustment").value),extraIncentive:num($("scenarioExtraIncentive").value),showRate:$("scenarioShowRate").checked,showResidual:$("scenarioShowResidual").checked,showFees:$("scenarioShowFees").checked,selected:state.scenarios.find(s=>s.id===$("scenarioId").value)?.selected||false};}
function updateScenarioPreview(){const old=state.scenarios.findIndex(s=>s.id===$("scenarioId").value),draft=scenarioFromDialog();if(old>=0)state.scenarios[old]=draft;else state.scenarios.push(draft);const r=calcScenario(draft);$("scenarioPreview").textContent=r.ready?(draft.onePay?`One-Pay ${money.format(r.onePayTotal)} · Equivalent ${money.format(r.equivalentMonthly)}`:`Estimated ${money.format(r.payment)}`):"Missing: "+r.missing.join(", ");if(old>=0)state.scenarios[old]=draft;else state.scenarios.pop();}
async function decodeVin(target){const id=target==="trade"?"tradeVin":"vin",vin=$(id).value.trim().toUpperCase();if(vin.length!==17){toast("Enter a 17-character VIN.");return}try{const res=await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/"+encodeURIComponent(vin)+"?format=json"),data=await res.json(),r=data.Results?.[0];if(target==="trade")$("tradeVehicle").value=[r.ModelYear,r.Make,r.Model,r.Trim].filter(Boolean).join(" ");else{$("year").value=r.ModelYear||"";$("make").value=r.Make||"BMW";$("model").value=[r.Model,r.Trim].filter(Boolean).join(" ")}updateComputed();toast("VIN decoded.")}catch(e){toast("VIN decoding failed.")}}
function resetRollPayment(options={}){if(!options.preserveScenario&&$("rollerScenario").options.length)$("rollerScenario").selectedIndex=0;$("rollerTarget").value="";$("rollerVariable").value="discount";$("rollerResult").textContent="Choose a scenario and target payment.";$("rollerResult").className="result-box";}
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
async function saveDeal(){readFormToState();state.updatedAt=new Date().toISOString();let rows=localDeals();const clientMatch=findMatchingClient(rows);if(!state.customer.clientId)state.customer.clientId=clientMatch?.customer?.clientId||crypto.randomUUID();let idx=rows.findIndex(d=>d.id===state.id);if(idx>=0)rows[idx]=structuredClone(state);else rows.unshift(structuredClone(state));saveLocalDeals(rows);savedDealsCache=[];savedDealsLoadedAt=0;if(supabaseClient&&currentUser){const result=await supabaseClient.from("v3_deals").upsert({id:state.id,user_id:currentUser.id,quote_number:state.quoteNumber,client_name:[state.customer.firstName,state.customer.lastName].filter(Boolean).join(" "),vehicle:[state.vehicle.year,state.vehicle.make,state.vehicle.model].filter(Boolean).join(" "),deal_data:state,updated_at:state.updatedAt});if(result.error){toast("Saved locally. Supabase: "+result.error.message);return}}clearAutosaveDraft();toast("Deal saved.");updateClientHistoryDisplays();renderDashboard();}
async function loadAllDeals(force=false){
 const now=Date.now();
 if(!force&&savedDealsCache.length&&now-savedDealsLoadedAt<30000)return savedDealsCache;
 let rows=localDeals();
 if(supabaseClient&&currentUser){
   const r=await supabaseClient.from("v3_deals").select("*").order("updated_at",{ascending:false});
   if(!r.error&&r.data?.length)rows=r.data.map(x=>x.deal_data);
 }
 savedDealsCache=rows.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
 savedDealsLoadedAt=now;
 return savedDealsCache;
}
function dealPrimaryMetrics(d){
 const scenarios=Array.isArray(d.scenarios)?d.scenarios:[];
 const chosen=scenarios.find(s=>s.id===d.acceptedScenarioId)||scenarios.find(s=>s.selected)||scenarios[0]||null;
 if(!chosen)return {type:"",payment:0,name:""};
 const prior=state;
 try{state=d;const result=calcScenario(chosen);return {type:chosen.type||"",payment:result.ready?num(chosen.onePay?result.onePayTotal:result.payment):0,name:chosen.name||""};}
 catch(error){return {type:chosen.type||"",payment:0,name:chosen.name||""};}
 finally{state=prior;}
}
function savedDealSearchText(d){
 const c=d.customer||{},v=d.vehicle||{},m=dealPrimaryMetrics(d);
 return normalizeClientText([
   c.firstName,c.lastName,c.coFirstName,c.coLastName,c.email,c.phone,c.salesperson,
   v.stockNumber,v.vin,v.year,v.make,v.model,d.quoteNumber,d.notes,m.type,m.name
 ].filter(Boolean).join(" "));
}
function dealMatchesSavedFilter(d,filter){
 if(filter==="all")return true;
 const c=d.customer||{},m=dealPrimaryMetrics(d),updated=new Date(d.updatedAt||d.createdAt||0),now=new Date();
 if(filter==="mine")return normalizeClientText(c.salesperson)===normalizeClientText(settings().defaultSalesperson);
 if(["lease","finance","select","cash"].includes(filter))return m.type===filter;
 if(filter==="month")return updated.getFullYear()===now.getFullYear()&&updated.getMonth()===now.getMonth();
 if(filter==="90days")return now-updated<=90*24*60*60*1000;
 return true;
}
function sortSavedDeals(rows,sort){
 const copy=[...rows],name=d=>normalizeClientText([d.customer?.firstName,d.customer?.lastName].filter(Boolean).join(" ")),vehicle=d=>normalizeClientText([d.vehicle?.year,d.vehicle?.make,d.vehicle?.model].filter(Boolean).join(" "));
 copy.sort((a,b)=>{
   if(sort==="oldest")return String(a.updatedAt).localeCompare(String(b.updatedAt));
   if(sort==="customer")return name(a).localeCompare(name(b));
   if(sort==="vehicle")return vehicle(a).localeCompare(vehicle(b));
   if(sort==="payment")return dealPrimaryMetrics(b).payment-dealPrimaryMetrics(a).payment;
   if(sort==="type")return dealPrimaryMetrics(a).type.localeCompare(dealPrimaryMetrics(b).type);
   if(sort==="salesperson")return normalizeClientText(a.customer?.salesperson).localeCompare(normalizeClientText(b.customer?.salesperson));
   return String(b.updatedAt).localeCompare(String(a.updatedAt));
 });
 return copy;
}
async function renderDashboard(force=false){
 const rows=await loadAllDeals(force),c=$("dashboardRecent");
 c.innerHTML=rows.slice(0,8).map(d=>savedCard(d)).join("")||'<div class="empty-state">No saved deals yet.</div>';
}
async function renderSaved(force=false){
 const allRows=await loadAllDeals(force),query=normalizeClientText($("savedDealSearch")?.value||""),sort=$("savedDealSort")?.value||"newest";
 let rows=allRows.filter(d=>dealMatchesSavedFilter(d,savedDealFilter)&&(!query||savedDealSearchText(d).includes(query)));
 rows=sortSavedDeals(rows,sort);
 const groups=new Map();
 rows.forEach(d=>{
   const key=d.customer?.clientId||normalizeClientText((d.customer?.firstName||"")+"|"+(d.customer?.lastName||""));
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(d);
 });
 $("savedDealCount").textContent=`Showing ${rows.length} of ${allRows.length} saved deal${allRows.length===1?"":"s"}`;
 $("savedDealsList").innerHTML=[...groups.values()].map(deals=>{
   const latest=deals[0];
   const name=[latest.customer?.firstName,latest.customer?.lastName].filter(Boolean).join(" ")||"Unnamed Client";
   const contact=[latest.customer?.email,latest.customer?.phone].filter(Boolean).join(" · ");
   return `<section class="client-group"><div class="client-group-header"><div><strong>${esc(name)}</strong><div class="item-meta">${esc(contact)}${contact?" · ":""}${deals.length} quote${deals.length===1?"":"s"}</div></div></div><div class="client-quote-list">${deals.map(d=>savedCard(d,true)).join("")}</div></section>`;
 }).join("")||'<div class="empty-state">No saved deals match your search or filter.</div>';
}
function savedCard(d,full=false){
 const name=[d.customer?.firstName,d.customer?.lastName].filter(Boolean).join(" ")||"Unnamed Client",vehicle=[d.vehicle?.year,d.vehicle?.make,d.vehicle?.model].filter(Boolean).join(" ")||"Vehicle",m=dealPrimaryMetrics(d),stock=d.vehicle?.stockNumber?`Stock ${d.vehicle.stockNumber}`:"",salesperson=d.customer?.salesperson||"";
 return `<div class="${full?"saved-item":"recent-item"}"><div><strong>${esc(name)}</strong><div class="item-meta">${esc(vehicle)} · ${esc(d.quoteNumber||"")} · ${new Date(d.updatedAt||d.createdAt).toLocaleString()}</div><div class="saved-item-details">${m.type?`<span class="saved-badge">${esc(m.type)}</span>`:""}${m.payment?`<span>${money.format(m.payment)}${m.type==="cash"?"":"/mo"}</span>`:""}${stock?`<span>${esc(stock)}</span>`:""}${salesperson?`<span>${esc(salesperson)}</span>`:""}</div></div><div class="button-row"><button class="secondary" data-load-deal="${d.id}">Open</button>${full?`<button class="secondary" data-duplicate-deal="${d.id}">Duplicate</button>`:""}</div></div>`;
}
async function loadDeal(id,duplicate=false){const rows=await loadAllDeals(),d=rows.find(x=>x.id===id);if(!d)return;state=structuredClone(d);if(duplicate){state.id=crypto.randomUUID();state.quoteNumber="Q-"+new Date().toISOString().replace(/\D/g,"").slice(0,14);state.createdAt=new Date().toISOString();state.updatedAt=state.createdAt}writeStateToForm();renderIncentives();renderScenarios();resetRollPayment();showPage("deal");toast(duplicate?"Deal duplicated.":"Deal opened.");}
function setProgramSyncStatus(message,kind=""){
 const el=$("programSyncStatus");
 if(!el)return;
 el.textContent=message;
 el.className="program-sync-status"+(kind?" "+kind:"");
}

function programRowForSupabase(program){
 const copy=structuredClone(program);
 const incentives=Array.isArray(copy.incentives)?copy.incentives:[];
 delete copy.incentives;
 return {
   id:program.id,
   user_id:currentUser.id,
   program_month:program.month||"",
   model_year:num(program.year)||null,
   model_code:program.modelCode||"",
   model_name:program.model||"",
   status:program.status||"review",
   effective_date:program.effectiveDate||null,
   expiration_date:program.expirationDate||null,
   program_data:copy,
   updated_at:new Date().toISOString(),
   incentives
 };
}

async function saveProgramToSupabase(program){
 if(!supabaseClient||!currentUser)return {skipped:true};
 if(!program.month||!program.modelCode)return {error:{message:"Program month and program code are required."}};

 // Resolve the database record by the same columns used by the unique index.
 // This makes repeat imports and copied months update the existing record rather
 // than failing because the local UUID differs from the Supabase UUID.
 let canonicalId=program.id||crypto.randomUUID();
 const existingResult=await supabaseClient
   .from("v3_programs")
   .select("id")
   .eq("user_id",currentUser.id)
   .eq("program_month",program.month)
   .eq("model_code",program.modelCode)
   .maybeSingle();
 if(existingResult.error)return {error:existingResult.error};
 if(existingResult.data?.id)canonicalId=existingResult.data.id;
 program.id=canonicalId;

 const row=programRowForSupabase(program);
 row.id=canonicalId;
 const programResult=await supabaseClient.from("v3_programs").upsert({
   id:row.id,
   user_id:row.user_id,
   program_month:row.program_month,
   model_year:row.model_year,
   model_code:row.model_code,
   model_name:row.model_name,
   status:row.status,
   effective_date:row.effective_date,
   expiration_date:row.expiration_date,
   program_data:{...row.program_data,id:canonicalId},
   updated_at:row.updated_at
 },{onConflict:"user_id,program_month,model_code"});
 if(programResult.error)return {error:programResult.error};

 const deleteResult=await supabaseClient
   .from("v3_program_incentives")
   .delete()
   .eq("program_id",canonicalId)
   .eq("user_id",currentUser.id);
 if(deleteResult.error)return {error:deleteResult.error};

 if(row.incentives.length){
   const incentiveRows=row.incentives.map(item=>({
     id:item.id||crypto.randomUUID(),
     program_id:canonicalId,
     user_id:currentUser.id,
     name:item.name||"",
     amount:num(item.amount),
     applies_to:item.appliesTo||"all",
     category:item.category||"customer",
     program_code:item.programCode||program.modelCode||"",
     incentive_data:{...item,programCode:item.programCode||program.modelCode||""},
     updated_at:new Date().toISOString()
   }));
   const incentiveResult=await supabaseClient
     .from("v3_program_incentives")
     .upsert(incentiveRows);
   if(incentiveResult.error)return {error:incentiveResult.error};
 }
 return {ok:true,id:canonicalId};
}

async function uploadLocalProgramsToSupabase(){
 if(!supabaseClient||!currentUser){
   toast("Sign in under Database before uploading programs.");
   setProgramSyncStatus("Not signed in. Programs remain local.","error");
   return;
 }
 const rows=programs();
 if(!rows.length){
   toast("There are no local programs to upload.");
   return;
 }
 setProgramSyncStatus(`Uploading ${rows.length} local programs…`,"working");
 let completed=0;
 for(const program of rows){
   const result=await saveProgramToSupabase(program);
   if(result.error){
     console.error(result.error);
     setProgramSyncStatus(`Upload stopped: ${result.error.message}`,"error");
     toast("Program upload failed: "+result.error.message);
     return;
   }
   completed++;
   setProgramSyncStatus(`Uploading programs ${completed} of ${rows.length}…`,"working");
 }
 setProgramSyncStatus(`${completed} programs uploaded to Supabase.`,"success");
 toast(`${completed} local programs are now shared across devices.`);
}

async function loadProgramsFromSupabase(showMessages=true){
 if(!supabaseClient||!currentUser){
   if(showMessages)setProgramSyncStatus("Not signed in. Showing programs stored in this browser.","local");
   return programs();
 }
 if(showMessages)setProgramSyncStatus("Loading shared programs from Supabase…","working");

 const programResult=await supabaseClient
   .from("v3_programs")
   .select("*")
   .order("program_month",{ascending:false});
 if(programResult.error){
   if(showMessages)setProgramSyncStatus("Could not load shared programs: "+programResult.error.message,"error");
   return programs();
 }

 const incentiveResult=await supabaseClient
   .from("v3_program_incentives")
   .select("*");
 if(incentiveResult.error){
   if(showMessages)setProgramSyncStatus("Programs loaded, but incentives failed: "+incentiveResult.error.message,"error");
   return programs();
 }

 const incentivesByProgram=new Map();
 (incentiveResult.data||[]).forEach(row=>{
   if(!incentivesByProgram.has(row.program_id))incentivesByProgram.set(row.program_id,[]);
   incentivesByProgram.get(row.program_id).push({
     ...(row.incentive_data||{}),
     id:row.id,
     name:row.name,
     amount:num(row.amount),
     appliesTo:row.applies_to,
     category:row.category,
     programCode:row.program_code
   });
 });

 const remote=(programResult.data||[]).map(row=>({
   ...(row.program_data||{}),
   id:row.id,
   month:row.program_month,
   year:row.model_year,
   modelCode:row.model_code,
   model:row.model_name,
   status:row.status,
   effectiveDate:row.effective_date||"",
   expirationDate:row.expiration_date||"",
   incentives:incentivesByProgram.get(row.id)||[]
 }));

 saveProgramsLocal(remote);
 renderPrograms();
 // Do not clear the incentive editor after a background sync. If the user has
 // already opened a program for editing, clearing only this section makes the
 // rates remain visible while its incentives appear to be missing. Refresh the
 // open editor from the newly loaded record instead.
 const editingProgramId=$("programId")?.value||"";
 if(editingProgramId){
   const editingProgram=remote.find(program=>program.id===editingProgramId);
   if(editingProgram)renderProgramIncentiveEditor(editingProgram.incentives||[]);
 }
 if(showMessages){
   setProgramSyncStatus(
     remote.length
       ? `${remote.length} shared programs loaded from Supabase.`
       : "Supabase has no programs yet. Use Upload Local Programs on the work laptop.",
     remote.length?"success":"local"
   );
 }
 return remote;
}

async function syncPrograms(){
 if(!supabaseClient||!currentUser){
   toast("Sign in under Database first.");
   setProgramSyncStatus("Not signed in. Showing local programs.","error");
   return;
 }
 await loadProgramsFromSupabase(true);
}
function renderPrograms(){
 const q=$("programSearch").value.toLowerCase(),rows=programs().filter(p=>JSON.stringify(p).toLowerCase().includes(q)).sort((a,b)=>String(b.month).localeCompare(String(a.month)));
 $("programHistory").innerHTML=rows.map(p=>`<div class="program-item"><div><strong>${esc(p.month+" · "+p.year+" "+p.model)}${p.modelCode?" · "+esc(p.modelCode):""}</strong><div class="item-meta">${esc(p.status)} · Residual ${p.residual||"—"}% · MF ${p.moneyFactor||"—"} · Finance ${p.financeApr||"—"}% · Select ${p.selectApr||"—"}% · ${(p.incentives||[]).length} incentives</div>${p.restrictions?`<div class="program-restriction">${esc(p.restrictions)}</div>`:""}</div><div class="button-row"><button class="secondary" data-use-program="${p.id}">Use</button><button class="secondary" data-edit-program="${p.id}">Edit</button><button class="secondary" data-duplicate-program="${p.id}">Duplicate</button><button class="secondary" data-archive-program="${p.id}">${p.status==="expired"?"Restore":"Archive"}</button></div></div>`).join("")||'<div class="empty-state">No programs saved.</div>';
}
function readProgramIncentiveEditor(){
 return [...document.querySelectorAll("#programIncentiveRows .program-incentive-row")].map(row=>({
   id:row.dataset.id||crypto.randomUUID(),name:row.querySelector("[data-field=name]").value.trim(),
   amount:num(row.querySelector("[data-field=amount]").value),appliesTo:row.querySelector("[data-field=appliesTo]").value,
   category:row.querySelector("[data-field=category]").value,programCode:row.querySelector("[data-field=programCode]").value.trim()
 })).filter(i=>i.name||i.amount);
}
async function saveProgram(){
 const code=$("programCode").value.trim().toUpperCase();
 const incentives=readProgramIncentiveEditor().map(item=>({...item,programCode:item.programCode||code}));
 const requestedId=$("programId")?.value||"";
 const p={id:requestedId||crypto.randomUUID(),month:$("programMonth").value,manufacturer:$("programManufacturer").value,year:num($("programYear").value),model:$("programModel").value.trim(),modelCode:code,status:$("programStatus").value,effectiveDate:$("programEffectiveDate").value,expirationDate:$("programExpirationDate").value,restrictions:$("programRestrictions").value.trim(),leaseTerm:num($("programLeaseTerm").value),residual:$("programResidual").value===""?"":num($("programResidual").value),moneyFactor:$("programMf").value===""?"":num($("programMf").value),onePayReduction:num($("programOnePayReduction").value),financeApr:$("programFinanceApr").value===""?"":num($("programFinanceApr").value),financeAprLong:"",financeTerm:num($("programFinanceTerm").value),selectApr:$("programSelectApr").value===""?"":num($("programSelectApr").value),selectTerm:num($("programSelectTerm").value),balloon:$("programBalloon").value===""?"":num($("programBalloon").value),incentives,source:"manual"};
 if(!p.month||!p.model||!p.modelCode){toast("Program month, model, and program code are required.");return}

 let rows=programs();
 const sameKey=rows.find(x=>x.month===p.month&&String(x.modelCode||"").toUpperCase()===p.modelCode&&x.id!==p.id);
 if(sameKey)p.id=sameKey.id;
 const i=rows.findIndex(x=>x.id===p.id);
 i>=0?rows[i]=p:rows.push(p);
 saveProgramsLocal(rows);
 renderPrograms();

 if(supabaseClient&&currentUser){
   const result=await saveProgramToSupabase(p);
   if(result.error){
     setProgramSyncStatus("Saved locally; Supabase failed: "+result.error.message,"error");
     toast("Program saved locally. Supabase: "+result.error.message);
   }else{
     // saveProgramToSupabase may adopt the existing database UUID.
     const refreshed=programs().filter(x=>!(x.month===p.month&&String(x.modelCode||"").toUpperCase()===p.modelCode&&x.id!==p.id));
     const idx=refreshed.findIndex(x=>x.month===p.month&&String(x.modelCode||"").toUpperCase()===p.modelCode);
     idx>=0?refreshed[idx]=p:refreshed.push(p);
     saveProgramsLocal(refreshed);
     renderPrograms();
     if($("programId"))$("programId").value=p.id;
     setProgramSyncStatus("Program saved to Supabase.","success");
     toast("Program saved and synced.");
   }
 }else{
   setProgramSyncStatus("Program saved only in this browser.","local");
   toast("Program saved locally. Sign in to sync it.");
 }
}

function duplicateProgram(id){
 const source=programs().find(x=>x.id===id);if(!source)return;
 const copy=structuredClone(source);
 copy.id=crypto.randomUUID();
 copy.status="carried";
 copy.source="manual-copy";
 copy.incentives=(copy.incentives||[]).map(i=>({...i,id:crypto.randomUUID()}));
 editProgramFromObject(copy,true);
 toast("Program duplicated. Change the month or program code, then save.");
}

function editProgramFromObject(p,isNew=false){
 let hidden=$("programId");if(!hidden){hidden=document.createElement("input");hidden.type="hidden";hidden.id="programId";$("page-programs").appendChild(hidden)}hidden.value=isNew?"":p.id;
 [["programMonth",p.month],["programManufacturer",p.manufacturer],["programYear",p.year],["programModel",p.model],["programStatus",p.status],["programEffectiveDate",p.effectiveDate],["programExpirationDate",p.expirationDate],["programRestrictions",p.restrictions],["programLeaseTerm",p.leaseTerm],["programResidual",p.residual],["programMf",p.moneyFactor],["programOnePayReduction",p.onePayReduction],["programFinanceApr",p.financeApr],["programFinanceTerm",p.financeTerm],["programSelectApr",p.selectApr],["programSelectTerm",p.selectTerm],["programBalloon",p.balloon],["programCode",p.modelCode||p.programCode]].forEach(x=>$(x[0]).value=x[1]??"");
 renderProgramIncentiveEditor((p.incentives||[]).map(i=>({...i,programCode:i.programCode||p.modelCode||""})));
 showPage("programs");
}

async function syncChangedPrograms(changed,message){
 if(!supabaseClient||!currentUser){setProgramSyncStatus(message+" saved locally. Sign in to sync.","local");return}
 setProgramSyncStatus(`Syncing ${changed.length} programs…`,"working");
 for(let i=0;i<changed.length;i++){
   const result=await saveProgramToSupabase(changed[i]);
   if(result.error){setProgramSyncStatus("Sync stopped: "+result.error.message,"error");toast("Supabase sync failed: "+result.error.message);return}
 }
 saveProgramsLocal(programs());
 setProgramSyncStatus(`${changed.length} programs synced.`,"success");
 toast(message+" and synced.");
}

async function copyProgramMonth(){
 const rows=programs();if(!rows.length){toast("No programs are available to copy.");return}
 const latest=[...new Set(rows.map(p=>p.month).filter(Boolean))].sort().reverse()[0]||"";
 const sourceMonth=prompt("Copy programs from which month? Use YYYY-MM.",latest);if(!sourceMonth)return;
 const targetMonth=prompt("Copy programs to which month? Use YYYY-MM.","");if(!targetMonth)return;
 if(!/^\d{4}-\d{2}$/.test(targetMonth)){toast("Use month format YYYY-MM.");return}
 const sourceRows=rows.filter(p=>p.month===sourceMonth);if(!sourceRows.length){toast("No programs found for "+sourceMonth);return}
 const existingCount=rows.filter(p=>p.month===targetMonth).length;
 if(existingCount&&!confirm(`${targetMonth} already has ${existingCount} programs. Matching program codes will be updated. Continue?`))return;
 const changed=sourceRows.map(source=>{const copy=structuredClone(source);const existing=rows.find(p=>p.month===targetMonth&&String(p.modelCode||"").toUpperCase()===String(source.modelCode||"").toUpperCase());copy.id=existing?.id||crypto.randomUUID();copy.month=targetMonth;copy.status="carried";copy.effectiveDate="";copy.expirationDate="";copy.source="month-copy";copy.incentives=(copy.incentives||[]).map(i=>({...i,id:crypto.randomUUID(),programCode:i.programCode||copy.modelCode||""}));return copy});
 const keys=new Set(changed.map(p=>p.month+"|"+String(p.modelCode||"").toUpperCase()));
 const merged=rows.filter(p=>!keys.has(p.month+"|"+String(p.modelCode||"").toUpperCase())).concat(changed);
 saveProgramsLocal(merged);renderPrograms();
 await syncChangedPrograms(changed,`${changed.length} programs copied to ${targetMonth}`);
}

async function bulkUpdatePrograms(){
 const month=prompt("Month to update (YYYY-MM):",$("programMonth").value||"");if(!month)return;
 const filter=(prompt("Optional model/code filter. Leave blank for every program in the month.","")||"").trim().toLowerCase();
 const field=(prompt("Field: residual, moneyFactor, financeApr, selectApr, balloon, leaseTerm, financeTerm, selectTerm, or onePayReduction","moneyFactor")||"").trim();
 const allowed=["residual","moneyFactor","financeApr","selectApr","balloon","leaseTerm","financeTerm","selectTerm","onePayReduction"];
 if(!allowed.includes(field)){toast("That bulk-update field is not supported.");return}
 const raw=prompt(`New value for ${field}:`,"");if(raw===null||raw.trim()==="")return;
 const value=Number(raw);if(!Number.isFinite(value)){toast("Enter a valid number.");return}
 const changed=programs().filter(p=>p.month===month&&(!filter||JSON.stringify([p.model,p.modelCode,p.year]).toLowerCase().includes(filter)));
 if(!changed.length){toast("No matching programs found.");return}
 if(!confirm(`Set ${field} to ${value} on ${changed.length} programs?`))return;
 changed.forEach(p=>p[field]=value);saveProgramsLocal(programs());renderPrograms();
 await syncChangedPrograms(changed,`${changed.length} programs updated`);
}

async function bulkUpdateIncentives(){
 const month=prompt("Month to update (YYYY-MM):",$("programMonth").value||"");if(!month)return;
 const filter=(prompt("Optional model/code filter. Leave blank for every program in the month.","")||"").trim().toLowerCase();
 const name=(prompt("Incentive name to add or update:","")||"").trim();if(!name)return;
 const raw=prompt("Incentive amount:","");if(raw===null)return;const amount=Number(raw);if(!Number.isFinite(amount)){toast("Enter a valid amount.");return}
 const appliesTo=(prompt("Applies to: all, lease, finance, select, or cash","all")||"all").trim().toLowerCase();
 if(!["all","lease","finance","select","cash"].includes(appliesTo)){toast("Invalid applies-to type.");return}
 const category=(prompt("Category: customer, dealer, or rate","customer")||"customer").trim().toLowerCase();
 if(!["customer","dealer","rate"].includes(category)){toast("Invalid category.");return}
 const changed=programs().filter(p=>p.month===month&&(!filter||JSON.stringify([p.model,p.modelCode,p.year]).toLowerCase().includes(filter)));
 if(!changed.length){toast("No matching programs found.");return}
 if(!confirm(`${amount===0?"Remove":"Add/update"} “${name}” on ${changed.length} programs?`))return;
 changed.forEach(p=>{p.incentives=Array.isArray(p.incentives)?p.incentives:[];const index=p.incentives.findIndex(i=>String(i.name||"").trim().toLowerCase()===name.toLowerCase());if(amount===0){if(index>=0)p.incentives.splice(index,1)}else{const item={id:index>=0?p.incentives[index].id:crypto.randomUUID(),name,amount,appliesTo,category,programCode:p.modelCode||""};index>=0?p.incentives[index]=item:p.incentives.push(item)}});
 saveProgramsLocal(programs());renderPrograms();
 await syncChangedPrograms(changed,`${changed.length} program incentives updated`);
}

function renderProgramIncentiveEditor(items=[]){
 const c=$("programIncentiveRows");
 c.innerHTML=items.length?items.map(i=>programIncentiveRowHtml(i)).join(""):'<div class="empty-state">No incentives added to this program.</div>';
}
function programIncentiveRowHtml(i={id:crypto.randomUUID(),name:"",amount:0,appliesTo:"all",category:"customer",programCode:""}){
 return `<div class="program-incentive-row" data-id="${i.id}"><input data-field="name" placeholder="Incentive name" value="${esc(i.name)}"><input data-field="amount" type="number" step=".01" value="${num(i.amount)}"><select data-field="appliesTo">${["all","lease","finance","cash","select"].map(v=>`<option value="${v}" ${i.appliesTo===v?"selected":""}>${v==="all"?"All Types":v}</option>`).join("")}</select><select data-field="category">${["customer","dealer","rate"].map(v=>`<option value="${v}" ${i.category===v?"selected":""}>${v}</option>`).join("")}</select><input data-field="programCode" placeholder="Program code" value="${esc(i.programCode||"")}"><button type="button" class="danger" data-remove-program-incentive="${i.id}">Remove</button></div>`;
}
function editProgram(id){
 const p=programs().find(x=>x.id===id);if(!p)return;
 editProgramFromObject(p,false);
}

function applyProgramToDialog(){
 const program=programs().find(item=>item.id===$("scenarioProgram").value);
 if(!program)return;

 const draft=scenarioFromDialog();
 applyProgramToScenarioObject(draft,program);

 $("scenarioTerm").value=draft.term||"";
 $("scenarioResidual").value=draft.residual??"";
 $("scenarioBaseMf").value=draft.baseMoneyFactor??"";
 $("scenarioMf").value=draft.moneyFactor??"";
 $("scenarioOnePayReduction").value=draft.onePayReduction??.00080;
 $("scenarioBuyApr").value=draft.buyApr??"";
 $("scenarioApr").value=draft.apr??"";
 $("scenarioBalloon").value=draft.balloon??"";

 const added=mergeProgramIncentivesIntoDeal(program);
 renderIncentives();
 renderScenarios();
 updateScenarioPreview();
 scheduleAutosave();

 toast(`Program rates and residuals loaded${added?` with ${added} new incentive${added===1?"":"s"}`:""}.`);
}
function loadSettingsForm(){const s=settings();$("dealerName").value=s.dealerName;$("defaultTax").value=s.defaultTax;$("reserveShare").value=s.reserveShare;$("defaultSalesperson").value=s.defaultSalesperson;$("defaultDocFee").value=s.docFee;$("defaultRegFee").value=s.regFee;$("defaultAcqFee").value=s.acqFee;$("defaultMiscFee").value=s.miscFee;$("salespeople").value=s.salespeople.join("\n");$("disclaimer").value=s.disclaimer;}
function saveSettings(){const s={dealerName:$("dealerName").value,defaultTax:num($("defaultTax").value),reserveShare:num($("reserveShare").value),defaultSalesperson:$("defaultSalesperson").value,docFee:num($("defaultDocFee").value),regFee:num($("defaultRegFee").value),acqFee:num($("defaultAcqFee").value),miscFee:num($("defaultMiscFee").value),salespeople:$("salespeople").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),disclaimer:$("disclaimer").value};localStorage.setItem(KEYS.settings,JSON.stringify(s));applySettingsToDeal(false);toast("Dealer settings saved.");}
function initializeSupabase(){
 const c=JSON.parse(localStorage.getItem(KEYS.connection)||"null");
 if(!c?.url||!c?.key)return false;
 supabaseClient=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,storage:localStorage,storageKey:"bqp3-auth"}});
 supabaseClient.auth.getSession().then(async r=>{
   currentUser=r.data.session?.user||null;
   updateConnectionStatus();
   if(currentUser)await loadProgramsFromSupabase(true);
 });
 supabaseClient.auth.onAuthStateChange(async(e,s)=>{
   currentUser=s?.user||null;
   updateConnectionStatus();
   if(currentUser)await loadProgramsFromSupabase(true);
   else setProgramSyncStatus("Signed out. Showing programs cached in this browser.","local");
 });
 return true;
}
function updateConnectionStatus(msg){$("connectionStatus").textContent=msg||(supabaseClient?(currentUser?`Connected and signed in as ${currentUser.email}`:"Connected — not signed in"):"Not connected.");}

function modelMatchParts(value){
 const normalized=normalizeModelName(value)
   .replace(/\b(xdrive|sdrive|edrive|xdr|sdr|edr)\b/g," ")
   .replace(/\b(plug in hybrid|phev|hybrid)\b/g," ")
   .replace(/\s+/g," ")
   .trim();
 const series=normalized.match(/\b(x[1-7]|xm|i[457x]|m[23458])\b/)?.[1]||"";
 const trim=normalized.match(/\b(20|28|30|35|40|45|50|60|70)(?:i|e|d)?\b/)?.[1]||"";
 return {normalized,series,trim};
}
function vehicleModelMatchesProgram(vehicleValue,programValue){
 const vehicle=modelMatchParts(vehicleValue);
 const program=modelMatchParts(programValue);
 if(!vehicle.normalized)return true;
 if(program.normalized===vehicle.normalized||program.normalized.includes(vehicle.normalized)||vehicle.normalized.includes(program.normalized))return true;
 if(vehicle.series&&program.series&&vehicle.series!==program.series)return false;
 if(vehicle.series&&program.series&&vehicle.trim&&program.trim)return vehicle.trim===program.trim;
 if(vehicle.series&&program.series)return true;
 return false;
}
function incentiveMatchCacheKey(){
 return `${num(state.vehicle.year)}|${normalizeModelName(state.vehicle.model)}`;
}
function currentProgramMatches(){
 const key=incentiveMatchCacheKey();
 const cached=incentiveMatchCache.get(key);
 if(cached)return cached;
 const y=num(state.vehicle.year),model=state.vehicle.model;
 let matches=programs().filter(p=>p.status!=="expired"&&(!y||num(p.year)===y)&&vehicleModelMatchesProgram(model,p.model));
 if(matches.length){
   const latestMonth=matches.reduce((latest,p)=>String(p.month||"")>latest?String(p.month||""):latest,"");
   matches=matches.filter(p=>String(p.month||"")===latestMonth);
 }
 incentiveMatchCache.set(key,matches);
 return matches;
}
function updateIncentivePickerButtons(){
 const selectedCount=$("availableIncentives").querySelectorAll("[data-pick-incentive]:checked").length;
 const apply=$("applyIncentives");
 apply.disabled=selectedCount===0;
 $("incentivePickerMessage").textContent=selectedCount
   ? `${selectedCount} incentive${selectedCount===1?"":"s"} selected`
   : "Select at least one incentive to apply.";
 $("incentivePickerMessage").className="picker-message"+(selectedCount?" ready":"");
}
function buildIncentivePicker(matches){
 const host=$("availableIncentives");
 const fragment=document.createDocumentFragment();
 const appliedKeys=new Set(state.incentives.map(x=>`${x.sourceProgramId}|${x.sourceIncentiveId}`));
 currentIncentivePickerItems=[];
 for(const program of matches){
   for(const incentive of (program.incentives||[])){
     const item={program,incentive};
     currentIncentivePickerItems.push(item);
     const key=`${program.id}|${incentive.id}`;
     const row=document.createElement("label");
     row.className="incentive-pick-row"+(appliedKeys.has(key)?" already-applied":"");
     const box=document.createElement("input");
     box.type="checkbox";
     box.dataset.pickIncentive=incentive.id;
     box.dataset.programId=program.id;
     box.checked=appliedKeys.has(key);
     const text=document.createElement("span");
     const name=document.createElement("strong");
     name.textContent=incentive.name||"Incentive";
     const meta=document.createElement("small");
     meta.textContent=`${program.month} · ${program.year} ${program.model} · ${incentiveAppliesLabel(incentive)}${box.checked?" · Currently applied":""}`;
     text.append(name,meta);
     const amount=document.createElement("strong");
     amount.textContent=money.format(num(incentive.amount));
     row.append(box,text,amount);
     fragment.append(row);
   }
 }
 host.replaceChildren();
 if(currentIncentivePickerItems.length)host.append(fragment);
 else{
   const empty=document.createElement("div");
   empty.className="empty-state incentive-empty";
   empty.innerHTML='<strong>No incentives are stored for the matching program.</strong><span>Use “Add Incentive to This Program” below to enter Loyalty, Lease Credit, Purchase Credit, Conquest or another available program.</span>';
   host.append(empty);
 }
}
function openIncentivePicker(programId=""){
 readFormToState();
 const matches=programId?programs().filter(p=>p.id===programId):currentProgramMatches();
 currentIncentiveProgramIds=matches.map(p=>p.id);
 $("incentiveProgramSummary").textContent=matches.length
   ? `${matches.length} latest matching program record${matches.length===1?"":"s"} for ${state.vehicle.year||""} ${state.vehicle.model||""}`
   : "No matching program found. Add the missing program first.";
 buildIncentivePicker(matches);
 const canAdd=matches.length>0;
 $("addIncentiveToProgram").disabled=!canAdd;
 $("addIncentiveToProgram").textContent=canAdd?"+ Add Incentive to This Program":"Add the Missing Program First";
 updateIncentivePickerButtons();
 $("incentiveDialog").showModal();
}
function refreshAfterIncentiveChange(){
 renderIncentives();
 requestAnimationFrame(()=>{
   renderScenarios();
   renderWorksheet();
   scheduleAutosave();
 });
}
function applyPickedIncentives(){
 const picked=[...$("availableIncentives").querySelectorAll("[data-pick-incentive]:checked")];
 if(!picked.length){
   toast("Select at least one incentive before clicking Apply Selected.");
   updateIncentivePickerButtons();
   return;
 }
 const lookup=new Map(currentIncentivePickerItems.map(({program,incentive})=>[`${program.id}|${incentive.id}`,{program,incentive}]));
 const selected=[];
 for(const box of picked){
   const found=lookup.get(`${box.dataset.programId}|${box.dataset.pickIncentive}`);
   if(!found)continue;
   selected.push({...found.incentive,id:crypto.randomUUID(),sourceProgramId:found.program.id,sourceIncentiveId:found.incentive.id});
 }
 if(!selected.length){
   toast("The selected incentives could not be found in the program record.");
   return;
 }
 state.incentives=selected;
 $("incentiveDialog").close();
 refreshAfterIncentiveChange();
 toast(`${selected.length} incentive${selected.length===1?"":"s"} applied.`);
}

function openAddProgramIncentiveDialog(){
 const programId=currentIncentiveProgramIds[0];
 const program=programs().find(p=>p.id===programId);

 if(!program){
   toast("Add or select a matching program first.");
   return;
 }

 $("programIncentiveProgramId").value=program.id;
 $("programIncentiveProgramLabel").textContent=
   `${program.month} · ${program.year} ${program.model}${program.modelCode?" · "+program.modelCode:""}`;
 $("newProgramIncentiveName").value="";
 $("newProgramIncentiveAmount").value="";
 $("newProgramIncentiveApplies").value="all";
 $("newProgramIncentiveCategory").value="customer";
 $("newProgramIncentiveCode").value=program.modelCode||"";
 $("programIncentiveDialog").showModal();
}

function saveProgramIncentiveFromDeal(){
 const programId=$("programIncentiveProgramId").value;
 const rows=programs();
 const program=rows.find(p=>p.id===programId);

 if(!program){
   toast("The matching program could not be found.");
   return false;
 }

 const name=$("newProgramIncentiveName").value.trim();
 const amount=num($("newProgramIncentiveAmount").value);

 if(!name||amount<=0){
   toast("Enter an incentive name and amount.");
   return false;
 }

 if(!Array.isArray(program.incentives))program.incentives=[];

 const incentive={
   id:crypto.randomUUID(),
   name,
   amount,
   appliesTo:$("newProgramIncentiveApplies").value,
   category:$("newProgramIncentiveCategory").value,
   programCode:$("newProgramIncentiveCode").value.trim()
 };

 program.incentives.push(incentive);
 saveProgramsLocal(rows);
 renderPrograms();
 if(supabaseClient&&currentUser)saveProgramToSupabase(program).then(result=>{
   if(result.error)setProgramSyncStatus("Incentive saved locally; sync failed: "+result.error.message,"error");
   else setProgramSyncStatus("Program incentive synced to Supabase.","success");
 });
 $("programIncentiveDialog").close();
 openIncentivePicker(programId);

 // Automatically select the newly added item.
 requestAnimationFrame(()=>{
   const checkbox=document.querySelector(
     `[data-pick-incentive="${incentive.id}"][data-program-id="${programId}"]`
   );
   if(checkbox){
     checkbox.checked=true;
     updateIncentivePickerButtons();
   }
 });

 toast("Incentive saved to the program.");
 return true;
}
function openQuickProgram(){
 readFormToState();
 $("quickMonth").value=new Date().toISOString().slice(0,7);$("quickYear").value=state.vehicle.year||"";$("quickModel").value=state.vehicle.model||"";$("quickModelCode").value="";["quickResidual","quickMf","quickRetailApr","quickRetailAprLong","quickSelectApr","quickLeaseCredit","quickPurchaseCredit","quickCashCredit","quickConquest","quickLoyalty","quickDealerContribution","quickEffectiveDate","quickExpirationDate","quickRestrictions"].forEach(id=>$(id).value="");
 $("quickProgramDialog").showModal();
}
function quickIncentive(name,amount,appliesTo){const t=Array.isArray(appliesTo)?appliesTo:[appliesTo];return amount>0?{id:crypto.randomUUID(),name,amount,appliesToTypes:t,appliesTo:t.length===1?t[0]:"all",category:name==="Loyalty Dealer Contribution"?"dealer":"customer",programCode:$("quickModelCode").value.trim()}:null}
function saveQuickProgram(){
 const p={id:crypto.randomUUID(),month:$("quickMonth").value,manufacturer:"BMW",year:num($("quickYear").value),model:$("quickModel").value.trim(),modelCode:$("quickModelCode").value.trim(),status:"management",effectiveDate:$("quickEffectiveDate").value,expirationDate:$("quickExpirationDate").value,restrictions:$("quickRestrictions").value.trim(),leaseTerm:36,residual:num($("quickResidual").value),moneyFactor:num($("quickMf").value),onePayReduction:.00080,financeApr:num($("quickRetailApr").value),financeAprLong:num($("quickRetailAprLong").value),financeTerm:60,selectApr:num($("quickSelectApr").value),selectTerm:60,balloon:"",source:"quick",incentives:[
   quickIncentive("FS Lease Credit",num($("quickLeaseCredit").value),"lease"),
   quickIncentive("FS Purchase Credit",num($("quickPurchaseCredit").value),["finance","select"]),
   quickIncentive("Cash Purchase Credit",num($("quickCashCredit").value),"cash"),
   quickIncentive("Conquest Credit",num($("quickConquest").value),"all"),
   quickIncentive("FS Lease/Purchase Loyalty",num($("quickLoyalty").value),["lease","finance","select"]),
   quickIncentive("Loyalty Dealer Contribution",num($("quickDealerContribution").value),["lease","finance","select"])
 ].filter(Boolean)};
 if(!p.month||!p.year||!p.model){toast("Month, model year and model are required.");return}
 const rows=programs();rows.push(p);saveProgramsLocal(rows);renderPrograms();
 if(supabaseClient&&currentUser)saveProgramToSupabase(p).then(result=>{
   if(result.error)setProgramSyncStatus("Quick program saved locally; sync failed: "+result.error.message,"error");
   else setProgramSyncStatus("Quick program synced to Supabase.","success");
 });
 $("quickProgramDialog").close();openIncentivePicker(p.id);toast("Program saved. Select the applicable incentives.");
}
const PDFJS_SOURCES=[
 "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs",
 "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.min.mjs",
 "https://esm.sh/pdfjs-dist@4.10.38/build/pdf.min.mjs"
];
const PDFJS_WORKER_SOURCES=[
 "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs",
 "https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs"
];

function setPdfImportStatus(message,kind=""){
 const el=$("pdfImportStatus");
 if(!el)return;
 el.textContent=message;
 el.className="pdf-import-status"+(kind?" "+kind:"");
}

function showPdfImportError(message=""){
 const el=$("pdfImportError");
 if(!el)return;
 el.textContent=message;
 el.classList.toggle("hidden",!message);
}

async function loadPdfJs(){
 if(window.pdfjsLib?.getDocument)return window.pdfjsLib;
 if(pdfJsModulePromise)return pdfJsModulePromise;

 pdfJsModulePromise=(async()=>{
   const errors=[];
   for(let index=0;index<PDFJS_SOURCES.length;index++){
     const source=PDFJS_SOURCES[index];
     try{
       setPdfImportStatus(`Loading PDF reader ${index+1} of ${PDFJS_SOURCES.length}…`,"working");
       const module=await import(source);
       if(!module?.getDocument)throw new Error("PDF module loaded without getDocument.");
       try{
         module.GlobalWorkerOptions.workerSrc=PDFJS_WORKER_SOURCES[Math.min(index,PDFJS_WORKER_SOURCES.length-1)];
       }catch(workerError){
         console.warn("PDF worker source could not be assigned:",workerError);
       }
       window.pdfjsLib=module;
       return module;
     }catch(error){
       console.warn("PDF reader source failed:",source,error);
       errors.push(error?.message||String(error));
     }
   }
   throw new Error(`The PDF reader could not be loaded. ${errors.join(" | ")}`);
 })().catch(error=>{
   pdfJsModulePromise=null;
   throw error;
 });

 return pdfJsModulePromise;
}

function normalizePdfLine(line){
 return String(line||"")
   .replace(/\u00a0/g," ")
   .replace(/[‐‑‒–—]/g,"-")
   .replace(/\s+/g," ")
   .trim();
}

function likelyProgramRow(line){
 return /^[0-9]{2}[A-Z][A-Z0-9]\s+/.test(line) &&
   /\s(?:Yes|No)\s+\d+%\s+\$/.test(line) &&
   /0\.\d{5}/.test(line);
}

function mergeWrappedProgramLines(lines){
 const merged=[];
 for(let i=0;i<lines.length;i++){
   let line=normalizePdfLine(lines[i]);
   if(!line)continue;
   if(/^[0-9]{2}[A-Z][A-Z0-9]\s+/.test(line)){
     let combined=line;
     let look=i+1;
     while(look<lines.length && !likelyProgramRow(combined) && look<=i+3){
       const next=normalizePdfLine(lines[look]);
       if(/^[0-9]{2}[A-Z][A-Z0-9]\s+/.test(next))break;
       if(next && !/^(BMW July Programs|Not Lockable|Rates apply|This document|Model Year|BEV|Lease|Loan|Non-FS|Conquest|Loyalty)/i.test(next)){
         combined+=" "+next;
       }
       look++;
     }
     merged.push(normalizePdfLine(combined));
   }else{
     merged.push(line);
   }
 }
 return merged;
}

function currencyValue(token){const s=String(token||"").replace(/[$,\s]/g,"");return s==="-"||s===""?0:num(s)}
function parseProgramRow(rawLine,meta){
 const line=normalizePdfLine(rawLine)
   .replace(/\$\s*-\s*/g,"$ - ")
   .replace(/(\d)\s*%/g,"$1%")
   .replace(/\s+/g," ");

 // BMW PDFs may extract the base residual as 55%, 55 %, or 55.0%.
 const header=line.match(
   /^([0-9]{2}[A-Z][A-Z0-9])\s+(.+?)\s+(Yes|No)\s+(\d+(?:\.\d+)?)\s*%\s+(.*)$/
 );
 if(!header)return null;

 const code=header[1];
 const model=header[2].trim();
 const lease39=header[3]==="Yes";
 const residualText=header[4];
 const residual=Number.parseFloat(residualText);
 const rest=header[5];

 const tokenPattern=/\$\s*(?:[\d,]+|-)|0\.\d{5}|[\d.]+\s*%/g;
 const tokens=[...rest.matchAll(tokenPattern)].map(match=>
   normalizePdfLine(match[0]).replace(/\s+%/g,"%")
 );

 // Expected table order after the 36-month/15K residual:
 // lease credit, MF, retail 24-60, retail 61-72, purchase credit,
 // Select, OwnersChoice, cash credit, conquest, loyalty,
 // dealer contribution, total loyalty, GKL loyalty, GKL conquest.
 if(tokens.length<14)return null;

 const moneyToken=token=>currencyValue(token.replace("$",""));
 const percentToken=token=>num(token.replace(/\s*%/,""));
 const year=2000+num(code.slice(0,2));

 const leaseCredit=moneyToken(tokens[0]);
 const moneyFactor=num(tokens[1]);
 const retailApr=percentToken(tokens[2]);
 const retailAprLong=percentToken(tokens[3]);
 const purchaseCredit=moneyToken(tokens[4]);
 const selectApr=percentToken(tokens[5]);
 const ownersChoice=percentToken(tokens[6]);
 const cashCredit=moneyToken(tokens[7]);
 const conquest=moneyToken(tokens[8]);
 const loyalty=moneyToken(tokens[9]);
 const dealerContribution=moneyToken(tokens[10]);
 const totalLoyalty=moneyToken(tokens[11]);
 const gklLoyalty=moneyToken(tokens[12]);
 const gklConquest=moneyToken(tokens[13]);

 const incentives=[
   ["FS Lease Credit",leaseCredit,"lease"],
   ["FS Purchase Credit",purchaseCredit,["finance","select"]],
   ["Cash Purchase Credit",cashCredit,"cash"],
   ["Conquest Credit",conquest,"all"],
   ["FS Lease/Purchase Loyalty",loyalty,["lease","finance","select"]],
   ["Loyalty Dealer Contribution",dealerContribution,["lease","finance","select"]],
   ["GKL Loyalty",gklLoyalty,"all"],
   ["GKL Conquest",gklConquest,"all"]
 ].map(([name,amount,appliesTo])=>({
   id:crypto.randomUUID(),
   name,
   amount,
   appliesToTypes:Array.isArray(appliesTo)?appliesTo:[appliesTo],
   appliesTo:Array.isArray(appliesTo)?(appliesTo.length===1?appliesTo[0]:"all"):appliesTo,
   category:"customer",
   programCode:code
 })).filter(item=>item.amount>0);

 const residualValid=Number.isFinite(residual) && residual>0 && residual<=100;

 return {
   id:crypto.randomUUID(),
   month:meta.month,
   manufacturer:"BMW",
   year,
   modelCode:code,
   model,
   status:residualValid?"review":"review",
   effectiveDate:meta.effectiveDate,
   expirationDate:meta.expirationDate,
   restrictions:meta.restrictions,
   leaseTerm:36,
   residual:residualValid?residual:"",
   residualSourceText:residualText,
   residualNeedsReview:!residualValid,
   residualBasis:"36 months / 15,000 miles",
   moneyFactor,
   onePayReduction:.00080,
   financeApr:retailApr,
   financeAprLong:retailAprLong,
   financeTerm:60,
   selectApr,
   selectTerm:60,
   ownersChoice,
   balloon:"",
   lease39Eligible:lease39,
   source:"pdf",
   sourceFile:meta.sourceFile,
   importedAt:new Date().toISOString(),
   incentives
 };
}
async function importProgramPdf(file){
 if(!file)return;

 showPdfImportError("");

 if(file.type && file.type!=="application/pdf" && !file.name.toLowerCase().endsWith(".pdf")){
   toast("Please select a PDF file.");
   setPdfImportStatus("Invalid file","error");
   showPdfImportError("The selected file is not recognized as a PDF.");
   return;
 }

 let stage="opening the file";

 try{
   setPdfImportStatus(`Opening ${file.name}…`,"working");
   toast("Reading BMW program PDF…");

   stage="loading the PDF reader";
   const pdfjs=await loadPdfJs();

   stage="reading the selected file";
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(!bytes.length)throw new Error("The selected PDF file is empty.");

   stage="opening the PDF document";
   setPdfImportStatus("Opening PDF document…","working");

   let pdf;
   try{
     // Some corporate networks block PDF.js worker files.
     // First attempt disables the worker dependency.
     pdf=await pdfjs.getDocument({data:bytes,disableWorker:true}).promise;
   }catch(firstError){
     console.warn("PDF open without worker failed; retrying normally.",firstError);
     pdf=await pdfjs.getDocument({data:bytes}).promise;
   }

   const rawLines=[];
   let meta={
     month:"",
     effectiveDate:"",
     expirationDate:"",
     restrictions:"",
     sourceFile:file.name
   };

   for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
     stage=`reading page ${pageNo} of ${pdf.numPages}`;
     setPdfImportStatus(`Reading page ${pageNo} of ${pdf.numPages}…`,"working");

     const page=await pdf.getPage(pageNo);
     const content=await page.getTextContent({includeMarkedContent:false});
     const groups=new Map();

     content.items.forEach(item=>{
       if(!item.str?.trim())return;
       const y=Math.round(item.transform[5]);
       if(!groups.has(y))groups.set(y,[]);
       groups.get(y).push(item);
     });

     [...groups.entries()]
       .sort((a,b)=>b[0]-a[0])
       .forEach(([,items])=>{
         const line=items
           .sort((a,b)=>a.transform[4]-b.transform[4])
           .map(item=>item.str)
           .join(" ");
         const clean=normalizePdfLine(line);
         if(clean)rawLines.push(clean);
       });
   }

   stage="combining PDF table rows";
   const lines=mergeWrappedProgramLines(rawLines);
   const full=lines.join("\n");

   const title=full.match(
     /BMW\s+([A-Za-z]+)\s+Programs\s+(\d{4})\s+\(effective:\s*(\d{1,2}\/\d{1,2}\/\d{2})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2})\)/i
   );

   if(title){
     const monthNumber=new Date(`${title[1]} 1, ${title[2]}`).getMonth()+1;
     meta.month=`${title[2]}-${String(monthNumber).padStart(2,"0")}`;
     meta.effectiveDate=toIsoDate(title[3]);
     meta.expirationDate=toIsoDate(title[4]);
   }

   const restrictionLines=lines.filter(line=>
     /Not Lockable|Must deliver|final eligibility|Sales Support Inquiry by VIN/i.test(line)
   ).slice(0,3);

   meta.restrictions=restrictionLines.join(" · ")||
     "Final eligibility must be confirmed by VIN.";

   stage="parsing program rows";

   // PDF.js can occasionally place page-number or watermark fragments before a
   // valid BMW model row (for example: "20 26XG X5 xDr40i ..."). The old
   // anchored test silently skipped those rows. Recover the row by locating the
   // first BMW model-code pattern that is followed by model text and Yes/No.
   const candidateLines=[];
   const candidateKeys=new Set();
   const addCandidate=recovered=>{
     recovered=normalizePdfLine(recovered);
     if(!recovered)return;
     const codeMatch=recovered.match(/^([0-9]{2}[A-Z][A-Z0-9])\s+/);
     if(!codeMatch)return;
     const key=codeMatch[1]+"|"+recovered.slice(0,160);
     if(!candidateKeys.has(key)){
       candidateKeys.add(key);
       candidateLines.push(recovered);
     }
   };

   // First pass: normal line-by-line recovery.
   lines.forEach(sourceLine=>{
     const line=normalizePdfLine(sourceLine);
     const matches=[...line.matchAll(/(?:^|\s)([0-9]{2}[A-Z][A-Z0-9])\s+(.+?)\s+(?:Yes|No)\s+\d+(?:\.\d+)?\s*%/g)];
     matches.forEach(match=>{
       const start=match.index+(match[0].startsWith(" ")?1:0);
       addCandidate(line.slice(start));
     });
   });

   // Second pass: rebuild rows from the complete PDF text stream. Some BMW
   // pages split one table row across several y-coordinates, so the model code,
   // model name and rate columns never exist in a single extracted line. Slice
   // from each BMW model code to the next code and let parseProgramRow validate
   // the segment. This specifically recovers rows such as 26XG and 26XT, but is
   // intentionally generic for future monthly PDFs.
   const flatPdfText=normalizePdfLine(rawLines.join(" "));
   const codeMatches=[...flatPdfText.matchAll(/(?:^|\s)([0-9]{2}[A-Z][A-Z0-9])\s+/g)];
   codeMatches.forEach((match,index)=>{
     const start=match.index+(match[0].startsWith(" ")?1:0);
     const next=codeMatches[index+1];
     const end=next ? next.index+(next[0].startsWith(" ")?1:0) : Math.min(flatPdfText.length,start+1200);
     const segment=flatPdfText.slice(start,end);
     if(/\s(?:Yes|No)\s+\d+(?:\.\d+)?\s*%/.test(segment))addCandidate(segment);
   });

   // Third pass: parse a fixed-width window after every model code. Do not stop
   // at the next code-looking token because page headers, footnotes, and PDF
   // artifacts can resemble BMW model codes and prematurely cut a valid row.
   // parseProgramRow only consumes the first complete 14-column rate set, so
   // the extra trailing text is harmless.
   codeMatches.forEach(match=>{
     const start=match.index+(match[0].startsWith(" ")?1:0);
     const window=flatPdfText.slice(start,Math.min(flatPdfText.length,start+1600));
     if(/^[0-9]{2}[A-Z][A-Z0-9]\s+.+?\s+(?:Yes|No)\s+\d+(?:\.\d+)?\s*%/.test(window)){
       addCandidate(window);
     }
   });

   const parsed=[];
   const rowErrors=[];

   candidateLines.forEach((line,index)=>{
     try{
       const row=parseProgramRow(line,meta);
       if(row)parsed.push(row);
     }catch(error){
       console.error("Program row parse failed:",line,error);
       rowErrors.push(`Row ${index+1}: ${error?.message||String(error)}`);
     }
   });

   importedProgramRows=parsed;

   stage="removing duplicate program rows";
   const unique=new Map();
   importedProgramRows.forEach(row=>{
     const key=`${row.month}|${row.modelCode}`;
     if(!unique.has(key))unique.set(key,row);
   });
   importedProgramRows=[...unique.values()];

   // Keep an explicit audit trail for rows that have repeatedly been missed in
   // BMW PDFs. This does not fabricate programs; it only reports whether the
   // actual PDF text produced a parsed row.
   const x5AuditCodes=["26XG","26XT"];
   const parsedCodes=new Set(importedProgramRows.map(row=>row.modelCode));
   const missingAuditCodes=x5AuditCodes.filter(code=>flatPdfText.includes(code)&&!parsedCodes.has(code));
   if(missingAuditCodes.length){
     console.error("PDF rows found in text but not parsed:",missingAuditCodes);
     rowErrors.push(`Found in PDF text but not parsed: ${missingAuditCodes.join(", ")}`);
   }

   $("importMetadata").textContent=
     `${file.name} · ${pdf.numPages} pages · `+
     `Effective ${meta.effectiveDate||"not detected"} through `+
     `${meta.expirationDate||"not detected"} · ${meta.restrictions}`;

   const warnings=[];
   if(!meta.month)warnings.push("The program month was not detected.");
   if(!meta.effectiveDate||!meta.expirationDate){
     warnings.push("The effective dates need review.");
   }
   if(!importedProgramRows.length){
     warnings.push(`No program rows were detected from ${candidateLines.length} possible rows.`);
   }

   const missingResidualRows=importedProgramRows.filter(row=>!num(row.residual));
   if(missingResidualRows.length){
     warnings.push(
       `${missingResidualRows.length} row${missingResidualRows.length===1?" has":"s have"} `+
       "a missing or invalid residual and must be corrected before saving."
     );
   }

   if(rowErrors.length){
     warnings.push(
       `${rowErrors.length} individual row${rowErrors.length===1?" was":"s were"} skipped. `+
       "The remaining rows can still be reviewed and imported."
     );
   }

   const warningsEl=$("importWarnings");
   warningsEl.classList.toggle("hidden",warnings.length===0);
   warningsEl.innerHTML=warnings.map(w=>`<div>⚠ ${esc(w)}</div>`).join("");

   stage="opening the import review";
   renderImportReview();
   $("importReviewDialog").showModal();

   setPdfImportStatus(
     importedProgramRows.length
       ? `${importedProgramRows.length} rows ready for review`
       : "PDF read; no rows detected",
     importedProgramRows.length?"success":"error"
   );

   if(rowErrors.length){
     showPdfImportError(
       `${rowErrors.length} malformed row${rowErrors.length===1?" was":"s were"} skipped. `+
       "Review the detected programs before saving."
     );
   }

   toast(
     importedProgramRows.length
       ? `Found ${importedProgramRows.length} program rows.`
       : "The PDF opened, but no program rows were detected."
   );
 }catch(error){
   console.error(`PDF import failed during ${stage}:`,error);
   const detail=error?.message||String(error);
   const message=`Import failed while ${stage}: ${detail}`;

   setPdfImportStatus("Import failed","error");
   showPdfImportError(message);
   toast(message);
 }
}
function toIsoDate(value){const [m,d,y]=value.split("/").map(Number);return `20${String(y).padStart(2,"0")}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function renderImportReview(){
 const missingResidualCount=importedProgramRows.filter(row=>!num(row.residual)).length;
 $("importRowCount").textContent=`${importedProgramRows.length} program rows detected`;
 $("residualReviewCount").textContent=missingResidualCount
   ? `${missingResidualCount} residual${missingResidualCount===1?"":"s"} require review`
   : "All residuals detected";
 $("residualReviewCount").className=
   "residual-review-count"+(missingResidualCount?" warning":" success");

 $("importReviewTable").innerHTML=importedProgramRows.length
   ? `<table>
       <thead>
         <tr>
           <th>Use</th><th>Year</th><th>Code</th><th>Model</th>
           <th>36/15K Base RV</th><th>MF</th><th>APR</th>
           <th>Select</th><th>Incentives</th><th>Status</th>
         </tr>
       </thead>
       <tbody>
         ${importedProgramRows.map((program,index)=>{
           const residualMissing=!num(program.residual);
           return `<tr class="${residualMissing?"residual-missing":""}">
             <td>
               <input type="checkbox" data-import-row="${index}"
                 ${residualMissing?"":"checked"}>
             </td>
             <td>${program.year}</td>
             <td>${esc(program.modelCode)}</td>
             <td><input data-import-edit="${index}" data-field="model"
               value="${esc(program.model)}"></td>
             <td>
               <div class="residual-review-cell">
                 <input type="number" min="1" max="100" step=".01"
                   data-import-edit="${index}" data-field="residual"
                   value="${program.residual}">
                 <span>${residualMissing
                   ?"Required"
                   :"36 mo / 15K"}</span>
               </div>
             </td>
             <td><input type="number" step=".00001"
               data-import-edit="${index}" data-field="moneyFactor"
               value="${program.moneyFactor}"></td>
             <td><input type="number" step=".01"
               data-import-edit="${index}" data-field="financeApr"
               value="${program.financeApr}"></td>
             <td><input type="number" step=".01"
               data-import-edit="${index}" data-field="selectApr"
               value="${program.selectApr}"></td>
             <td>${program.incentives.length}</td>
             <td><span class="${residualMissing
               ?"import-status-warning"
               :"import-status-ready"}">${residualMissing
                 ?"Residual missing"
                 :"Ready for review"}</span></td>
           </tr>`;
         }).join("")}
       </tbody>
     </table>`
   : '<div class="empty-state">No program rows could be detected. The PDF layout may need a parser update.</div>';
}
function saveApprovedImports(){
 const selectedIndexes=[...document.querySelectorAll("[data-import-row]:checked")]
   .map(box=>num(box.dataset.importRow));
 const checked=selectedIndexes.map(index=>importedProgramRows[index]);

 if(!checked.length){
   toast("No rows selected.");
   return;
 }

 const invalid=checked.filter(program=>!num(program.residual));
 if(invalid.length){
   toast(`Correct the residual for ${invalid.length} selected row${invalid.length===1?"":"s"}, or deselect them.`);
   const firstIndex=importedProgramRows.indexOf(invalid[0]);
   const input=document.querySelector(
     `[data-import-edit="${firstIndex}"][data-field="residual"]`
   );
   input?.focus();
   return;
 }

 const rows=programs();
 checked.forEach(program=>{
   program.residualNeedsReview=false;
   const existing=rows.findIndex(row=>
     row.month===program.month &&
     row.modelCode===program.modelCode
   );
   existing>=0?rows[existing]=program:rows.push(program);
 });

 saveProgramsLocal(rows);
 renderPrograms();
 if(supabaseClient&&currentUser){
   Promise.all(checked.map(program=>saveProgramToSupabase(program))).then(results=>{
     const failed=results.find(result=>result.error);
     if(failed)setProgramSyncStatus("PDF programs saved locally; sync failed: "+failed.error.message,"error");
     else setProgramSyncStatus(`${checked.length} imported programs synced to Supabase.`,"success");
   });
 }else{
   setProgramSyncStatus("Imported programs saved only in this browser.","local");
 }
 $("importReviewDialog").close();
 $("programPdfFile").value="";
 setPdfImportStatus(`${checked.length} programs saved`,"success");
 toast(`${checked.length} programs imported with residuals.`);
}
function bindEvents(){bindNav();document.querySelectorAll("#page-deal input,#page-deal select,#page-deal textarea").forEach(e=>{e.addEventListener("input",()=>{updateComputed();scheduleAutosave()});e.addEventListener("change",()=>{updateComputed();scheduleAutosave()})});$("newDealButton").onclick=()=>{state=createEmptyDeal();applySettingsToDeal(true);state.scenarios=[defaultScenario("lease"),defaultScenario("finance"),defaultScenario("select")];state.scenarios.forEach(s=>s.selected=true);clearAutosaveDraft();writeStateToForm();resetRollPayment();showPage("deal")};$("clearDealButton").onclick=$("newDealButton").onclick;$("saveDealButton").onclick=saveDeal;$("selectIncentivesButton").onclick=()=>openIncentivePicker();$("quickProgramButton").onclick=openQuickProgram;$("addScenarioButton").onclick=()=>openScenario(null);$("applyBmwProgramButton").onclick=openProgramPicker;$("rollPaymentButton").onclick=rollPayment;$("clearRollPaymentButton").onclick=()=>resetRollPayment({preserveScenario:true});$("rollerScenario").onchange=()=>resetRollPayment({preserveScenario:true});$("rollerVariable").onchange=()=>{$("rollerResult").textContent="Choose a scenario and target payment.";$("rollerResult").className="result-box"};$("decodeVin").onclick=()=>decodeVin("vehicle");$("decodeTradeVin").onclick=()=>decodeVin("trade");$("refreshQuote").onclick=renderQuote;$("printQuote").onclick=()=>{document.body.classList.add("print-quote");window.print();setTimeout(()=>document.body.classList.remove("print-quote"),500)};$("printWorksheet").onclick=()=>{document.body.classList.add("print-worksheet");window.print();setTimeout(()=>document.body.classList.remove("print-worksheet"),500)};$("refreshDashboard").onclick=()=>renderDashboard(true);$("refreshSaved").onclick=()=>renderSaved(true);$("saveSettings").onclick=saveSettings;$("saveProgram").onclick=saveProgram;$("syncProgramsButton").onclick=syncPrograms;$("uploadLocalProgramsButton").onclick=uploadLocalProgramsToSupabase;$("addProgramIncentive").onclick=()=>{const c=$("programIncentiveRows");if(c.querySelector(".empty-state"))c.innerHTML="";c.insertAdjacentHTML("beforeend",programIncentiveRowHtml())};$("importProgramPdf").onclick=()=>{$("programPdfFile").value="";showPdfImportError("");setPdfImportStatus("Choose a BMW program PDF…","working");$("programPdfFile").click()};$("programPdfFile").onchange=e=>{const file=e.target.files?.[0];if(file)importProgramPdf(file);else setPdfImportStatus("No file selected")};$("programSearch").oninput=renderPrograms;$("copyPriorProgram").onclick=()=>{const p=[...programs()].sort((a,b)=>String(b.month).localeCompare(String(a.month)))[0];if(p)duplicateProgram(p.id);else toast("No program is available to duplicate.")};$("copyProgramMonth").onclick=copyProgramMonth;$("bulkUpdatePrograms").onclick=bulkUpdatePrograms;$("bulkUpdateIncentives").onclick=bulkUpdateIncentives;$("closeScenarioDialog").onclick=()=>$("scenarioDialog").close();$("cancelScenario").onclick=()=>$("scenarioDialog").close();$("scenarioForm").onsubmit=e=>{e.preventDefault();const s=scenarioFromDialog(),i=state.scenarios.findIndex(x=>x.id===s.id);i>=0?state.scenarios[i]=s:state.scenarios.push(s);$("scenarioDialog").close();renderScenarios();scheduleAutosave()};$("scenarioType").onchange=()=>{updateScenarioFields();updateScenarioPreview()};$("scenarioProgram").onchange=applyProgramToDialog;document.querySelectorAll("#scenarioDialog input,#scenarioDialog select").forEach(e=>e.addEventListener("input",updateScenarioPreview));$("incentiveRows").addEventListener("click",e=>{
 const id=e.target.dataset.removeIncentive;
 if(!id)return;
 const incentive=state.incentives.find(x=>x.id===id);
 if(!incentive)return;
 if(!confirm(`Remove "${incentive.name}" from this deal?`))return;
 state.incentives=state.incentives.filter(x=>x.id!==id);
 refreshAfterIncentiveChange();
 toast("Incentive removed from the deal.");
});$("scenarioGrid").addEventListener("click",e=>{
 const moveId=e.target.dataset.moveScenario;if(moveId){moveScenario(moveId,num(e.target.dataset.direction));return}
 const id=e.target.dataset.editScenario||e.target.dataset.duplicateScenario||e.target.dataset.renameScenario||e.target.dataset.deleteScenario;if(!id)return;
 const s=state.scenarios.find(x=>x.id===id);if(e.target.dataset.editScenario)openScenario(s);
 if(e.target.dataset.duplicateScenario){const d=structuredClone(s);d.id=crypto.randomUUID();d.name+=" Copy";d.selected=false;state.scenarios.push(d);renderScenarios();scheduleAutosave()}
 if(e.target.dataset.renameScenario){const n=prompt("Scenario name:",s.name);if(n){s.name=n;renderScenarios();scheduleAutosave()}}
 if(e.target.dataset.deleteScenario&&confirm(`Delete "${s.name}"?`)){state.scenarios=state.scenarios.filter(x=>x.id!==id);if(state.acceptedScenarioId===id)state.acceptedScenarioId="";renderScenarios();scheduleAutosave()}
});
$("scenarioGrid").addEventListener("change",e=>{
 const selectId=e.target.dataset.selectScenario;if(selectId){if(e.target.checked&&state.scenarios.filter(x=>x.selected).length>=3){e.target.checked=false;toast("Only three scenarios can be presented.");return}state.scenarios.find(x=>x.id===selectId).selected=e.target.checked;renderScenarios();scheduleAutosave()}
 const acceptedId=e.target.dataset.acceptScenario;if(acceptedId){state.acceptedScenarioId=acceptedId;renderScenarios();renderWorksheet();scheduleAutosave()}
});
$("scenarioGrid").addEventListener("dragstart",e=>{const card=e.target.closest("[data-scenario-card]");if(card){draggedScenarioId=card.dataset.scenarioCard;card.classList.add("dragging")}});
$("scenarioGrid").addEventListener("dragend",e=>{e.target.closest("[data-scenario-card]")?.classList.remove("dragging");draggedScenarioId=null});
$("scenarioGrid").addEventListener("dragover",e=>{e.preventDefault();const target=e.target.closest("[data-scenario-card]");if(!target||!draggedScenarioId||target.dataset.scenarioCard===draggedScenarioId)return;const from=state.scenarios.findIndex(s=>s.id===draggedScenarioId),to=state.scenarios.findIndex(s=>s.id===target.dataset.scenarioCard);const [item]=state.scenarios.splice(from,1);state.scenarios.splice(to,0,item);renderScenarios()});
$("scenarioGrid").addEventListener("drop",e=>{e.preventDefault();scheduleAutosave()});$("closeProgramPicker").onclick=$("cancelProgramPicker").onclick=()=>$("programPickerDialog").close();
$("programPickerMonth").onchange=renderProgramPickerResults;
$("programPickerYear").onchange=renderProgramPickerResults;
$("programPickerSearch").oninput=renderProgramPickerResults;
$("programPickerResults").addEventListener("click",event=>{
 const id=event.target.dataset.applyProgram;
 if(id)applyProgramToDeal(id);
});
$("closeIncentiveDialog").onclick=$("cancelIncentives").onclick=()=>$("incentiveDialog").close();
$("applyIncentives").onclick=applyPickedIncentives;
$("addIncentiveToProgram").onclick=openAddProgramIncentiveDialog;
$("availableIncentives").addEventListener("change",e=>{
 if(e.target.matches("[data-pick-incentive]"))updateIncentivePickerButtons();
});
$("closeProgramIncentiveDialog").onclick=$("cancelProgramIncentive").onclick=()=>$("programIncentiveDialog").close();
$("programIncentiveForm").onsubmit=e=>{
 e.preventDefault();
 saveProgramIncentiveFromDeal();
};
$("closeQuickProgram").onclick=$("cancelQuickProgram").onclick=()=>$("quickProgramDialog").close();$("quickProgramForm").onsubmit=e=>{e.preventDefault();saveQuickProgram()};
$("closeImportReview").onclick=$("cancelImportReview").onclick=()=>$("importReviewDialog").close();$("saveImportedPrograms").onclick=saveApprovedImports;$("selectAllImported").onchange=e=>document.querySelectorAll("[data-import-row]").forEach(x=>x.checked=e.target.checked);
$("importReviewTable").addEventListener("input",e=>{
 const index=e.target.dataset.importEdit;
 if(index===undefined)return;
 const program=importedProgramRows[num(index)];
 const field=e.target.dataset.field;
 program[field]=e.target.type==="number"
   ? (e.target.value===""?"":num(e.target.value))
   : e.target.value;
 if(field==="residual"){
   program.residualNeedsReview=!num(program.residual);
   renderImportReview();
   const edited=document.querySelector(
     `[data-import-edit="${index}"][data-field="residual"]`
   );
   edited?.focus();
 }
});
$("programIncentiveRows").addEventListener("click",e=>{if(e.target.dataset.removeProgramIncentive)e.target.closest(".program-incentive-row").remove()});
$("savedDealSearch").addEventListener("input",renderSaved);
$("savedDealSort").addEventListener("change",renderSaved);
document.querySelectorAll("[data-saved-filter]").forEach(button=>button.addEventListener("click",()=>{
 savedDealFilter=button.dataset.savedFilter;
 document.querySelectorAll("[data-saved-filter]").forEach(b=>b.classList.toggle("active",b===button));
 renderSaved();
}));
document.body.addEventListener("click",e=>{if(e.target.dataset.loadDeal)loadDeal(e.target.dataset.loadDeal);if(e.target.dataset.duplicateDeal)loadDeal(e.target.dataset.duplicateDeal,true);if(e.target.dataset.useProgram){applyProgramToDeal(e.target.dataset.useProgram)}if(e.target.dataset.editProgram)editProgram(e.target.dataset.editProgram);if(e.target.dataset.duplicateProgram)duplicateProgram(e.target.dataset.duplicateProgram);if(e.target.dataset.archiveProgram){let rows=programs(),p=rows.find(x=>x.id===e.target.dataset.archiveProgram);p.status=p.status==="expired"?"confirmed":"expired";saveProgramsLocal(rows);renderPrograms();
 if(supabaseClient&&currentUser)saveProgramToSupabase(p)}});$("saveConnection").onclick=()=>{localStorage.setItem(KEYS.connection,JSON.stringify({url:$("supabaseUrl").value.trim(),key:$("supabaseKey").value.trim()}));initializeSupabase();updateConnectionStatus("Connection saved.")};$("testConnection").onclick=async()=>{if(!supabaseClient&&!initializeSupabase()){updateConnectionStatus("Enter and save connection details.");return}const r=await supabaseClient.auth.getSession();updateConnectionStatus(r.error?r.error.message:"Connection works.")};$("createAccount").onclick=async()=>{if(!supabaseClient&&!initializeSupabase())return;const r=await supabaseClient.auth.signUp({email:$("authEmail").value,password:$("authPassword").value});updateConnectionStatus(r.error?r.error.message:"Account created. Check email if confirmation is enabled.")};$("signIn").onclick=async()=>{if(!supabaseClient&&!initializeSupabase())return;const r=await supabaseClient.auth.signInWithPassword({email:$("authEmail").value,password:$("authPassword").value});updateConnectionStatus(r.error?r.error.message:"Signed in.");if(!r.error){currentUser=r.data.user;await loadProgramsFromSupabase(true)}};$("signOut").onclick=async()=>{if(supabaseClient)await supabaseClient.auth.signOut();currentUser=null;updateConnectionStatus()};}
function init(){loadSettingsForm();const c=JSON.parse(localStorage.getItem(KEYS.connection)||"null");if(c){$("supabaseUrl").value=c.url||"";$("supabaseKey").value=c.key||"";initializeSupabase()}applySettingsToDeal(true);if(!restoreAutosaveDraft()){state.scenarios=[defaultScenario("lease"),defaultScenario("finance"),defaultScenario("select")];state.scenarios.forEach(s=>s.selected=true);writeStateToForm();setAutosaveStatus("Draft ready")}bindEvents();renderIncentives();renderScenarios();renderDashboard();renderPrograms();renderProgramIncentiveEditor([]);updateClientHistoryDisplays();setPdfImportStatus("Importer ready");setProgramSyncStatus(currentUser?"Loading shared programs…":"Programs are local until you sign in and sync.");$("programMonth").value=new Date().toISOString().slice(0,7);}
document.addEventListener("DOMContentLoaded",init);
})();