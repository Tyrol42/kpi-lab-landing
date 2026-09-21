/**
 * KPI LAB - Валидация формы, маска телефона, AJAX-отправка, модальные окна и FAQ аккордеон
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // 1. МАСКА НОМЕРА ТЕЛЕФОНА (+7 (XXX) XXX-XX-XX)
  function setupPhoneMask(input) {
    if (!input) return;

    input.addEventListener('input', onPhoneInput);
    input.addEventListener('keydown', onPhoneKeyDown);
    input.addEventListener('paste', onPhonePaste);
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

  // Применяем маску ко всем полям телефона на странице
  document.querySelectorAll('input[type="tel"]').forEach(setupPhoneMask);

  // 2. ВАЛИДАЦИЯ И ОБРАБОТКА ОШИБОК
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

  function setupInputClearEvents(formEl) {
    formEl.querySelectorAll('input, select').forEach(inp => {
      inp.addEventListener('input', () => clearFieldError(inp));
      inp.addEventListener('change', () => clearFieldError(inp));
    });
  }

  function validateFormElements(formEl) {
    let isValid = true;
    let firstInvalid = null;

    const nameInput = formEl.querySelector('input[name="name"]') || formEl.querySelector('#client-name');
    const phoneInput = formEl.querySelector('input[name="phone"]') || formEl.querySelector('#client-phone');
    const agreeCheckbox = formEl.querySelector('input[type="checkbox"]');

    if (nameInput) {
      const nameVal = nameInput.value.trim();
      if (!nameVal || nameVal.length < 2) {
        setFieldError(nameInput, 'Пожалуйста, введите ваше имя (минимум 2 буквы)');
        isValid = false;
        if (!firstInvalid) firstInvalid = nameInput;
      } else {
        clearFieldError(nameInput);
      }
    }

    if (phoneInput) {
      const digits = getDigitsOnly(phoneInput.value.trim());
      if (!digits || digits.length < 11) {
        setFieldError(phoneInput, 'Пожалуйста, укажите полный номер телефона');
        isValid = false;
        if (!firstInvalid) firstInvalid = phoneInput;
      } else {
        clearFieldError(phoneInput);
      }
    }

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

  // 3. ОТПРАВКА ЗАЯВКИ (ГЛАВНАЯ ФОРМА И МОДАЛЬНАЯ)
  async function submitLeadForm(formEl, options = {}) {
    if (!validateFormElements(formEl)) {
      return;
    }

    const nameInput = formEl.querySelector('input[name="name"]') || formEl.querySelector('#client-name');
    const phoneInput = formEl.querySelector('input[name="phone"]') || formEl.querySelector('#client-phone');
    const siteInput = formEl.querySelector('input[name="site"]') || formEl.querySelector('#client-site');
    const goalInput = formEl.querySelector('input[name="goal"]') || formEl.querySelector('#client-goal');
    const submitBtn = formEl.querySelector('button[type="submit"]');

    const submitBtnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
    const submitBtnLoader = submitBtn ? submitBtn.querySelector('.btn-loader') : null;
    const originalText = submitBtnText ? submitBtnText.textContent : 'Отправить';

    // Сбор данных аналитики
    const attribution = window.KPITracker 
      ? window.KPITracker.getAttribution() 
      : { source: 'Прямой заход', utm: {} };

    const payload = {
      name: nameInput ? nameInput.value.trim() : '',
      phone: phoneInput ? phoneInput.value.trim() : '',
      site: siteInput ? siteInput.value.trim() : '',
      serviceGoal: (goalInput ? goalInput.value.trim() : '') || options.defaultGoal || 'Заявка с лендинга (Консультация)',
      calculatorData: window.lastCalcResult || null,
      source: attribution.source,
      utm: attribution.utm || {},
      referrer: attribution.referrer || '',
      device: attribution.device || '',
      rawUrl: window.location.href
    };

    // Блокируем кнопку
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');
      if (submitBtnText) submitBtnText.textContent = 'Отправка...';
      if (submitBtnLoader) submitBtnLoader.style.display = 'inline-block';
    }

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
        formEl.reset();

        if (options.isModal) {
          closeModal();
          showGlobalToast('Спасибо! Заявка успешно принята. Эксперт KPI LAB свяжется с вами в течение 15 минут.');
        } else {
          const successBox = document.getElementById('form-success');
          if (successBox) {
            successBox.style.display = 'flex';
            successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      } else {
        alert(data.error || 'Произошла ошибка при отправке заявки. Пожалуйста, повторите попытку.');
      }
    } catch (err) {
      console.error('Ошибка сети:', err);
      alert('Не удалось связаться с сервером. Проверьте интернет-соединение.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
        if (submitBtnText) submitBtnText.textContent = originalText;
        if (submitBtnLoader) submitBtnLoader.style.display = 'none';
      }
    }
  }

  // Привязка главной формы
  const mainForm = document.getElementById('lead-form');
  if (mainForm) {
    setupInputClearEvents(mainForm);
    mainForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitLeadForm(mainForm, { defaultGoal: 'Расчет стоимости и прогноз позиций' });
    });
  }

  // 4. МОДАЛЬНОЕ ОКНО БЫСТРОГО ЗАКАЗА (POPUP)
  const modal = document.getElementById('cta-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalForm = document.getElementById('modal-lead-form');
  const modalTitle = document.getElementById('modal-title');
  const modalGoalInput = document.getElementById('modal-client-goal');

  function openModal(goalTitle, goalDescription) {
    if (!modal) return;
    if (modalTitle) modalTitle.textContent = goalTitle || 'Оставить заявку';
    if (modalGoalInput) modalGoalInput.value = goalTitle || 'Заявка с сайта';
    
    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-active');
    document.body.style.overflow = '';
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Привязка отправки модальной формы
  if (modalForm) {
    setupInputClearEvents(modalForm);
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitLeadForm(modalForm, { isModal: true });
    });
  }

  // Привязка кликов по кнопкам с data-cta
  document.querySelectorAll('[data-cta]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const ctaType = btn.getAttribute('data-cta');
      let title = 'Получить расчёт и аудит';

      if (ctaType === 'forecast') {
        title = 'Получить персональный прогноз позиций в ТОП-3';
      } else if (ctaType === 'safety_audit') {
        title = 'Бесплатная экспресс-проверка сайта на готовность к ПФ';
      } else if (ctaType === 'savings') {
        title = 'Расчет экономии бюджета относительно Яндекс Директа';
      } else if (ctaType === 'consultation') {
        title = '15-минутная консультация с ведущим SEO-инженером';
      } else if (ctaType === 'case_study') {
        title = 'Запрос детального кейса и медиаплана для вашей ниши';
      }

      openModal(title);
    });
  });

  // 5. АККОРДЕОН FAQ (ОТВЕТЫ НА ВОПРОСЫ)
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('is-open');
      // Закрываем другие вопросы
      document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('is-open'));
      
      if (!isActive) {
        item.classList.add('is-open');
      }
    });
  });

  // 6. ТАБЫ КЕЙСОВ (E-commerce / Медицина / B2B)
  const caseTabs = document.querySelectorAll('.case-tab-btn');
  const caseCards = document.querySelectorAll('.case-card-panel');

  caseTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      caseTabs.forEach(t => t.classList.remove('is-active'));
      caseCards.forEach(c => c.classList.remove('is-active'));

      tab.classList.add('is-active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('is-active');
    });
  });

  // Всплывающее уведомление
  function showGlobalToast(message) {
    const toast = document.createElement('div');
    toast.className = 'global-toast';
    toast.innerHTML = `<span>✓</span> <div>${message}</div>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('is-visible');
    }, 50);

    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }
});
