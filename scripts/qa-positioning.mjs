import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const origin=process.argv[2] || 'http://localhost:3100';
const local=/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
const output=process.argv[3] || 'output/posicionamiento-08-11-2026/qa';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
const paths=['/','/servicios','/catalogos-digitales','/sistemas-web/gestion-personas','/sistemas-web/control-flota','/contacto','/cotizador','/planes','/tiendas-online','/paginas-web/constructoras'];
try {
 for(const width of [1440,360,390,430]){
  const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.route('**/*',r=> /googletagmanager|google-analytics/.test(r.request().url()) || !['GET','HEAD'].includes(r.request().method()) ? r.abort() : r.continue());
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of paths){
   const response=await page.goto(origin+path,{waitUntil:'networkidle',timeout:90000});assert.equal(response.status(),200,path);
   assert.equal(new URL(page.url()).pathname,path,`${path}: destino final`);
   const canonical=await page.locator('link[rel=canonical]').getAttribute('href');
   assert.equal(canonical,'https://www.zyteron.cl'+(path==='/'?'':path));
   assert.equal(await page.locator('main h1').count(),1,path);
   if(path==='/'){
    assert.equal((await page.locator('main h1').innerText()).replace(/\s+/g,' '),'Desarrollo de software y soluciones digitales a medida');
    assert.equal(await page.locator('.hero-actions a').first().getAttribute('href'),'/contacto?origen=inicio');
    assert.equal(await page.locator('.solution-family').count(),5);
    await page.screenshot({path:`${output}/${width}-inicio.png`});
   }
   if(path==='/sistemas-web/gestion-personas') assert.match(await page.locator('main h1').innerText(),/Gestión de personas y recursos humanos/);
   if(path==='/contacto') assert.equal(await page.locator('#projectType').inputValue(),'');
   if(path==='/servicios') assert.equal(await page.locator('.solution-family').count(),5);
   // Renderiza las secciones diferidas para auditar y capturar todo el documento.
   await page.addStyleTag({content: '.cv-auto { content-visibility: visible !important; contain-intrinsic-size: auto !important; }'});
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
   const row={width,path,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),violations:axe.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),errors:[...errors]};results.push(row);console.log(JSON.stringify(row));
   if(['/servicios','/contacto','/catalogos-digitales','/sistemas-web/gestion-personas'].includes(path)) await page.screenshot({path:`${output}/${width}-${path.replaceAll('/','-')}.png`,fullPage:true});
  }
  await page.goto(origin+'/',{waitUntil:'networkidle'});
  if(width===1440){
   await page.locator('.solutions-menu summary').click();assert.equal(await page.locator('.solutions-menu-panel a').count(),6);
   await page.locator('.solutions-menu summary').press('Escape');assert.equal(await page.locator('.solutions-menu').getAttribute('open'),null);
  }else{
   await page.getByRole('button',{name:'Abrir menú'}).click();assert.equal(await page.locator('#mobile-navigation .mobile-solutions a').count(),5);
   await page.getByRole('navigation',{name:'Navegación móvil'}).getByRole('link',{name:'Personas y operaciones',exact:true}).click();
   await page.waitForURL('**/servicios#personas-operaciones');assert.equal(await page.locator('#mobile-navigation').count(),0);
  }
  for(const [query,expected] of [
    ['servicio=gestion-personas','Gestión de personas o recursos humanos'],
    ['servicio=control-flota','Control de flota u operaciones'],
    ['servicio=catalogos-digitales&plan=catalogo','Catálogo de productos'],
    ['tipo=orientacion','Orientación para definir la solución'],
    ['servicio=paginas-web/constructoras&tipo=web','Sitio de presentación empresarial o profesional'],
  ]){
   await page.goto(origin+'/contacto?'+query,{waitUntil:'networkidle'});
   await page.waitForFunction(expected=>document.querySelector('#projectType')?.value===expected,expected);
  }
  if(local){
   await page.goto(origin+'/contacto?servicio=gestion-personas&origen=qa',{waitUntil:'networkidle'});
   const requests=[];let failed=true;
   await page.route('**/api/contacto',route=>{
    requests.push(route.request().postDataJSON());
    return route.fulfill({status:failed?503:200,contentType:'application/json',body:JSON.stringify(failed?{error:'Controlled failure'}:{ok:true,leadId:'ab000000-0000-4000-a000-000000000000',reference:'QA-LOCAL'})});
   });
   await page.getByRole('button',{name:'Solicitar diagnóstico',exact:true}).click();
   assert.equal(requests.length,0);await page.locator('#name-error').waitFor();
   await page.locator('#name').fill('Prueba local');await page.locator('#email').fill('qa@example.com');await page.locator('#phone').fill('+56911111111');await page.locator('#message').fill('Ordenar documentos y solicitudes de personal.');
   await page.getByRole('button',{name:'Solicitar diagnóstico',exact:true}).click();await page.getByRole('alert').filter({hasText:'No pudimos confirmar'}).waitFor();
   assert.equal(await page.locator('#email').inputValue(),'qa@example.com');
   const before=await page.evaluate(()=>(window.dataLayer||[]).filter(v=>v[0]==='event'&&v[1]==='generate_lead').length);assert.equal(before,0);
   failed=false;await page.getByRole('button',{name:'Solicitar diagnóstico',exact:true}).click();await page.getByRole('heading',{name:'Solicitud recibida'}).waitFor();
   assert.equal(requests.length,2);assert.equal(requests[0].clientSubmissionId,requests[1].clientSubmissionId);
   const events=await page.evaluate(()=>(window.dataLayer||[]).filter(v=>v[0]==='event'));
   const lead=events.filter(v=>v[1]==='generate_lead');assert.equal(lead.length,1);assert.equal(lead[0][2].solution_family,'personas_operaciones');
   assert.ok(!JSON.stringify(events).includes('qa@example.com'));assert.ok(!JSON.stringify(events).includes('Ordenar documentos'));
  }
  await context.close();
 }
}finally{await browser.close();await writeFile(`${output}/results.json`,JSON.stringify({origin,local,results},null,2));}
assert.equal(results.length,40);
assert.ok(results.every(r=>!r.overflow&&!r.violations.length&&!r.errors.length),'Revisar informe QA');
console.log('Navegación, contexto y validaciones completos.');
