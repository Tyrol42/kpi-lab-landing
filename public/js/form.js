/**
 * KPI LAB - Валидация формы, маска телефона, AJAX-отправка и инспектор проверки
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const form = document.getElementById('lead-form');
  const nameInput = document.getElementById('client-name');
  const phoneInput = document.getElementById('client-phone');
  const siteInput = document.getElementById('client-site');
  const agreeCheckbox = document.getElementById('policy-agree');
  const submitBtn = document.getElementById('submit-btn');
  const submitBtnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
  const submitBtnLoader = submitBtn ? submitBtn.querySelector('.btn-loader') : null;
  const formSuccessAlert = document.getElementById('form-success');
  const formErrorAlert = document.getElementById('form-error');

  // 1. МАСКА НОМЕРА ТЕЛЕФОНА (+7 (XXX) XXX-XX-XX)
  if (phoneInput) {
    phoneInput.addEventListener('input', onPhoneInput);
    phoneInput.addEventListener('keydown', onPhoneKeyDown);
    phoneInput.addEventListener('paste', onPhonePaste);
  }

  function getDigitsOnly(str) {
    return str.replace(/\D/g, '');
  }

  function onPhoneInput(e) {
    const input = e.target;
    let inputNumbersValue = getDigitsOnly(input.value);
    const selectionStart = input.selectionStart;
    let formattedInputValue = '';

    if (!inputNumbersValue) {
      return (input.value = '');
    }

    if (input.value.length !== selectionStart) {
      // Редактирование в середине строки
      if (e.data && /\D/g.test(e.data)) {
        input.value = inputNumbersValue;
      }
      return;
    }

    if (['7', '8', '9'].indexOf(inputNumbersValue[0]) > -1) {
      if (inputNumbersValue[0] === '9') inputNumbersValue = '7' + inputNumbersValue;
      const firstSymbols = inputNumbersValue[0] === '8' ? '8' : '+7';
      formattedInputValue = firstSymbols + ' ';

      if (inputNumbersValue.length > 1) {
        formattedInputValue += '(' + inputNumbersValue.substring(1, 4);
      }
      if (inputNumbersValue.length >= 5) {
        formattedInputValue += ') ' + inputNumbersValue.substring(4, 7);
      }
      if (inputNumbersValue.length >= 8) {
        formattedInputValue += '-' + inputNumbersValue.substring(7, 9);
      }
      if (inputNumbersValue.length >= 10) {
        formattedInputValue += '-' + inputNumbersValue.substring(9, 11);
      }
    } else {
      // Иностранный номер
      formattedInputValue = '+' + inputNumbersValue.substring(0, 16);
    }
    input.value = formattedInputValue;
  }

  function onPhoneKeyDown(e) {
    const input = e.target;
    if (e.keyCode === 8 && getDigitsOnly(input.value).length === 1) {
      input.value = '';
    }
  }

  function onPhonePaste(e) {
    const pasted = e.clipboardData || window.clipboardData;
    const input = e.target;
    const inputNumbersValue = getDigitsOnly(input.value);
    if (pasted) {
      const data = pasted.getData('Text');
      if (/\D/g.test(data)) {
        input.value = inputNumbersValue;
      }
    }
  }

  // 2. ОЧИСТКА ОШИБОК ПРИ ВВОДЕ
  const inputsToClear = [nameInput, phoneInput, siteInput, agreeCheckbox];
  inputsToClear.forEach(inp => {
    if (!inp) return;
    inp.addEventListener('input', () => clearFieldError(inp));
    inp.addEventListener('change', () => clearFieldError(inp));
  });

  function clearFieldError(input) {
    input.classList.remove('is-invalid');
    const group = input.closest('.form-group') || input.closest('.form-check');
    if (group) {
      const errorMsg = group.querySelector('.invalid-feedback');
      if (errorMsg) errorMsg.style.display = 'none';
    }
  }

  function setFieldError(input, message) {
    input.classList.add('is-invalid');
    const group = input.closest('.form-group') || input.closest('.form-check');
    if (group) {
      let errorMsg = group.querySelector('.invalid-feedback');
      if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.className = 'invalid-feedback';
        group.appendChild(errorMsg);
      }
      errorMsg.textContent = message;
      errorMsg.style.display = 'block';
    }
  }

  // 3. ВАЛИДАЦИЯ ФОРМЫ
  function validateForm() {
    let isValid = true;
    let firstInvalid = null;

    // Валидация имени
    const nameVal = nameInput ? nameInput.value.trim() : '';
    if (!nameVal || nameVal.length < 2) {
      setFieldError(nameInput, 'Пожалуйста, введите ваше имя (минимум 2 буквы)');
      isValid = false;
      if (!firstInvalid) firstInvalid = nameInput;
    } else {
      clearFieldError(nameInput);
    }

    // Валидация телефона
    const phoneVal = phoneInput ? phoneInput.value.trim() : '';
    const digits = getDigitsOnly(phoneVal);
    if (!digits || digits.length < 11) {
      setFieldError(phoneInput, 'Пожалуйста, укажите полный номер телефона');
      isValid = false;
      if (!firstInvalid) firstInvalid = phoneInput;
    } else {
      clearFieldError(phoneInput);
    }

    // Валидация чекбокса политики
    if (agreeCheckbox && !agreeCheckbox.checked) {
      setFieldError(agreeCheckbox, 'Необходимо согласие на обработку данных');
      isValid = false;
      if (!firstInvalid) firstInvalid = agreeCheckbox;
    } else if (agreeCheckbox) {
      clearFieldError(agreeCheckbox);
    }

    if (!isValid && firstInvalid) {
      firstInvalid.focus();
    }

    return isValid;
  }

  // 4. ОБРАБОТКА ОТПРАВКИ
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Скрываем предыдущие статусы
      if (formSuccessAlert) formSuccessAlert.style.display = 'none';
      if (formErrorAlert) formErrorAlert.style.display = 'none';

      // Проверяем валидацию
      if (!validateForm()) {
        return;
      }

      // Получаем данные аналитики из трекера
      const attribution = window.KPITracker 
        ? window.KPITracker.getAttribution() 
        : { source: 'Прямой заход', utm: {} };

      const payload = {
        name: nameInput.value.trim(),
        phone: phoneInput.value.trim(),
        site: siteInput ? siteInput.value.trim() : '',
        source: attribution.source,
        utm: attribution.utm || {},
        referrer: attribution.referrer || '',
        device: attribution.device || '',
        rawUrl: window.location.href
      };

      // Блокируем кнопку и включаем лоадер
      setLoadingState(true);

      try {
        const response = await fetch('/api/lead', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Успех
          form.reset();
          if (formSuccessAlert) {
            formSuccessAlert.style.display = 'flex';
            formSuccessAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          // Ошибка от сервера
          showFormError(data.error || 'Произошла ошибка при отправке. Попробуйте еще раз.');
        }
      } catch (err) {
        console.error('Ошибка сети:', err);
        showFormError('Не удалось связаться с сервером. Проверьте соединение.');
      } finally {
        setLoadingState(false);
      }
    });
  }

  function setLoadingState(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    if (isLoading) {
      submitBtn.classList.add('is-loading');
      if (submitBtnText) submitBtnText.textContent = 'Отправка заявки...';
      if (submitBtnLoader) submitBtnLoader.style.display = 'inline-block';
    } else {
      submitBtn.classList.remove('is-loading');
      if (submitBtnText) submitBtnText.textContent = 'Получить расчёт и аудит';
      if (submitBtnLoader) submitBtnLoader.style.display = 'none';
    }
  }

  function showFormError(msg) {
    if (formErrorAlert) {
      formErrorAlert.textContent = msg;
      formErrorAlert.style.display = 'block';
      formErrorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert(msg);
    }
  }

  // 5. ДЕБАГ-ВИДЖЕТ ДЛЯ УДОБСТВА ПРОВЕРКИ ТЕСТОВОГО ЗАДАНИЯ
  initDebugWidget();

  function initDebugWidget() {
    const attribution = window.KPITracker 
      ? window.KPITracker.getAttribution() 
      : { source: 'Загрузка...', utm: {} };

    const widget = document.createElement('div');
    widget.className = 'debug-inspector';
    widget.id = 'debug-inspector';

    const utmCount = Object.keys(attribution.utm || {}).length;

    widget.innerHTML = `
      <div class="debug-header" id="debug-toggle">
        <div class="debug-status-dot"></div>
        <span class="debug-title"><b>Инспектор аналитики</b> (для проверки ТЗ)</span>
        <button type="button" class="debug-btn-toggle" aria-label="Свернуть/Развернуть">▼</button>
      </div>
      <div class="debug-body" id="debug-body">
        <div class="debug-row">
          <span class="debug-label">Определенный источник:</span>
          <span class="debug-val debug-val-source">${attribution.source}</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">Наличие UTM-меток:</span>
          <span class="debug-val">${utmCount > 0 ? `<span class="badge-success">Да (${utmCount} шт.)</span>` : '<span class="badge-gray">Нет (без меток)</span>'}</span>
        </div>
        ${utmCount > 0 ? `
          <div class="debug-utm-list">
            ${Object.entries(attribution.utm).map(([k, v]) => `<div><code>${k}</code>: <b>${v}</b></div>`).join('')}
          </div>
        ` : ''}
        <div class="debug-row">
          <span class="debug-label">Реферер:</span>
          <span class="debug-val debug-val-sm">${document.referrer ? document.referrer : 'Прямой заход (пусто)'}</span>
        </div>
        <div class="debug-actions">
          <div class="debug-actions-title">Быстрые сценарии тестирования:</div>
          <div class="debug-btn-group">
            <a href="?utm_source=yandex&utm_medium=cpc&utm_campaign=pf_promo&utm_content=banner_top&utm_term=prodvizhenie_pf" class="debug-link-btn">1. Тест с UTM (Директ)</a>
            <a href="/" class="debug-link-btn">2. Тест без меток (Прямой)</a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    // Тоггл сворачивания виджета
    const toggleBtn = widget.querySelector('#debug-toggle');
    const debugBody = widget.querySelector('#debug-body');
    const arrow = widget.querySelector('.debug-btn-toggle');

    toggleBtn.addEventListener('click', () => {
      const isCollapsed = debugBody.style.display === 'none';
      debugBody.style.display = isCollapsed ? 'block' : 'none';
      arrow.textContent = isCollapsed ? '▼' : '▲';
    });
  }
});
