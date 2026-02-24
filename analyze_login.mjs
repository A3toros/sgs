import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function analyzeLoginPage() {
  try {
    const response = await fetch('https://sgs.bopp-obec.info/sgs/Default.aspx');
    const html = await response.text();
    console.log('HTML length:', html.length);

    const $ = cheerio.load(html);

    // Look for all buttons and inputs
    console.log('All buttons:');
    $('button, input[type="submit"], input[type="button"]').each((i, el) => {
      const tag = $(el).prop('tagName').toLowerCase();
      const type = $(el).attr('type') || 'button';
      const name = $(el).attr('name') || 'none';
      const id = $(el).attr('id') || 'none';
      const value = $(el).attr('value') || $(el).text() || 'none';
      console.log(`${i}: ${tag} ${type} - name:${name} id:${id} value:${value}`);
    });

    // Look for onclick handlers
    console.log('\nElements with onclick:');
    $('[onclick]').each((i, el) => {
      const onclick = $(el).attr('onclick');
      const tag = $(el).prop('tagName').toLowerCase();
      const id = $(el).attr('id') || 'none';
      console.log(`${i}: ${tag} id:${id} onclick:${onclick}`);
    });

    // Look for __doPostBack calls
    console.log('\n__doPostBack calls:');
    const doPostBackMatches = html.match(/__doPostBack\([^)]+\)/g);
    if (doPostBackMatches) {
      doPostBackMatches.forEach((match, i) => {
        console.log(`${i}: ${match}`);
      });
    }

    // Look for elements containing "ตกลง" (OK)
    console.log('\nElements containing "ตกลง":');
    $('*').filter((i, el) => $(el).text().includes('ตกลง')).each((i, el) => {
      const tag = $(el).prop('tagName').toLowerCase();
      const id = $(el).attr('id') || 'none';
      const name = $(el).attr('name') || 'none';
      const type = $(el).attr('type') || 'none';
      const onclick = $(el).attr('onclick') || 'none';
      const text = $(el).text().trim();
      console.log(`${i}: ${tag} id:${id} name:${name} type:${type} onclick:${onclick} text:"${text}"`);
    });

    // Look for all input elements
    console.log('\nAll input elements:');
    $('input').each((i, el) => {
      const type = $(el).attr('type') || 'text';
      const name = $(el).attr('name') || 'none';
      const id = $(el).attr('id') || 'none';
      const value = $(el).attr('value') || 'none';
      if (type === 'submit' || name.includes('Button') || id.includes('Button')) {
        console.log(`${i}: input ${type} - name:${name} id:${id} value:${value}`);
      }
    });

    // Look for form action
    const form = $('form');
    console.log('\nForm action:', form.attr('action'));

  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeLoginPage();

analyzeLoginPage();