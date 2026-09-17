// Vercel Serverless Function handler
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Метод не поддерживается' });
  }

  try {
    const { name, phone, site, source, utm = {}, referrer, device, rawUrl } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Пожалуйста, укажите корректное имя' });
    }

    if (!phone || typeof phone !== 'string' || phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, error: 'Пожалуйста, укажите корректный номер телефона' });
    }

    // Форматирование даты МСК
    const time = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date()) + ' (МСК)';

    const escapeHtml = (str) => {
      if (!str) return '—';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const utmList = [];
    if (utm.utm_source) utmList.push(`• <b>utm_source:</b> ${escapeHtml(utm.utm_source)}`);
    if (utm.utm_medium) utmList.push(`• <b>utm_medium:</b> ${escapeHtml(utm.utm_medium)}`);
    if (utm.utm_campaign) utmList.push(`• <b>utm_campaign:</b> ${escapeHtml(utm.utm_campaign)}`);
    if (utm.utm_content) utmList.push(`• <b>utm_content:</b> ${escapeHtml(utm.utm_content)}`);
    if (utm.utm_term) utmList.push(`• <b>utm_term:</b> ${escapeHtml(utm.utm_term)}`);
    if (utm.yclid) utmList.push(`• <b>yclid (Директ ID):</b> ${escapeHtml(utm.yclid)}`);
    if (utm.gclid) utmList.push(`• <b>gclid (Google ID):</b> ${escapeHtml(utm.gclid)}`);

    const utmSection = utmList.length > 0 
      ? `🏷 <b>UTM-метки:</b>\n${utmList.join('\n')}` 
      : '🏷 <b>UTM-метки:</b> отсутствуют';

    const message = `🔥 <b>НОВАЯ ЗАЯВКА С ЛЕНДИНГА KPI LAB</b>
───────────────
👤 <b>Имя:</b> ${escapeHtml(name.trim())}
📞 <b>Телефон:</b> ${escapeHtml(phone.trim())}
🌐 <b>Сайт/Проект:</b> ${escapeHtml((site || '').trim() || 'не указан')}

📊 <b>Источник перехода:</b>
<b>${escapeHtml(source || 'Не определен')}</b>

${utmSection}

🔗 <b>Реферер:</b> ${escapeHtml(referrer || 'Прямой заход (без реферера)')}
📱 <b>Устройство:</b> ${escapeHtml(device || 'Десктоп/Браузер')}
⏰ <b>Время заявки:</b> ${time}`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId || botToken === 'your_bot_token_here' || chatId === 'your_chat_id_here') {
      console.log('Заявка принята (MOCK):', message);
      return res.status(200).json({
        success: true,
        message: 'Заявка принята! (Telegram в режиме симуляции)',
        mock: true
      });
    }

    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) {
      return res.status(500).json({ success: false, error: tgData.description });
    }

    return res.status(200).json({
      success: true,
      message: 'Спасибо! Ваша заявка принята. Эксперт KPI LAB свяжется с вами в течение 15 минут.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
