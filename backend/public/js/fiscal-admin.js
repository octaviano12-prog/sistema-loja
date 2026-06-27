(() => {
  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function valueOf(obj, key, fallback = '') {
    const value = obj && obj[key] !== undefined && obj[key] !== null ? obj[key] : fallback;
    return esc(value);
  }

  function checked(obj, key, fallback = true) {
    const value = obj && obj[key] !== undefined && obj[key] !== null ? obj[key] : fallback;
    return value === true || value === 1 || value === '1' || value === 'true' ? 'checked' : '';
  }

  function selectOption(value, current) {
    return String(value) === String(current || '') ? 'selected' : '';
  }

  function fiscalValidationBox(validation = {}) {
    const missing = validation.missing || [];
    const warnings = validation.warnings || [];
    if (!missing.length && !warnings.length) {
      return '<div class="p-3 rounded-lg bg-green-50 text-green-700 text-sm">Configuração fiscal básica preenchida.</div>';
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="p-3 rounded-lg ${missing.length ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'} text-sm">
          <strong>Obrigatórios</strong>
          ${missing.length ? `<ul class="list-disc ml-5 mt-1">${missing.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : '<p class="mt-1">Nenhuma pendência obrigatória.</p>'}
        </div>
        <div class="p-3 rounded-lg ${warnings.length ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'} text-sm">
          <strong>Atenção</strong>
          ${warnings.length ? `<ul class="list-disc ml-5 mt-1">${warnings.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : '<p class="mt-1">Nenhum aviso.</p>'}
        </div>
      </div>`;
  }

  function field(label, name, value, type = 'text', extra = '') {
    return `<div><label class="text-sm font-medium text-gray-700">${label}</label><input name="${name}" type="${type}" value="${value}" class="input-field mt-1" ${extra}></div>`;
  }

  function selectField(label, name, current, options) {
    return `<div><label class="text-sm font-medium text-gray-700">${label}</label><select name="${name}" class="input-field mt-1">${options.map(opt => `<option value="${opt.value}" ${selectOption(opt.value, current)}>${opt.label}</option>`).join('')}</select></div>`;
  }

  function fiscalSettingsForm(settings) {
    return `
      <form onsubmit="saveFiscalSettings(event)" class="space-y-6">
        <div class="card p-4">
          <div class="flex flex-col sm:flex-row justify-between gap-3 mb-4">
            <div>
              <h3 class="font-semibold text-gray-800">Dados da Empresa / Emitente</h3>
              <p class="text-xs text-gray-500">Dados usados como base da NF-e/NFC-e.</p>
            </div>
            <label class="inline-flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" name="sync_company" value="1" class="rounded"> Sincronizar também com dados da empresa</label>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${field('Razão Social *', 'legal_name', valueOf(settings, 'legal_name'))}
            ${field('Nome Fantasia', 'trade_name', valueOf(settings, 'trade_name'))}
            ${field('CNPJ *', 'cnpj', valueOf(settings, 'cnpj'), 'text', 'placeholder="00.000.000/0000-00"')}
            ${field('Inscrição Estadual', 'state_registration', valueOf(settings, 'state_registration'))}
            ${field('Inscrição Municipal', 'municipal_registration', valueOf(settings, 'municipal_registration'))}
            ${selectField('Regime Tributário *', 'tax_regime', settings.tax_regime || 'simples', [
              { value: 'simples', label: 'Simples Nacional' },
              { value: 'lucro_presumido', label: 'Lucro Presumido' },
              { value: 'lucro_real', label: 'Lucro Real' },
              { value: 'mei', label: 'MEI' }
            ])}
            ${selectField('CRT *', 'crt', settings.crt || '1', [
              { value: '1', label: '1 - Simples Nacional' },
              { value: '2', label: '2 - Simples excesso sublimite' },
              { value: '3', label: '3 - Regime Normal' }
            ])}
            ${field('UF SEFAZ *', 'sefaz_state', valueOf(settings, 'sefaz_state'), 'text', 'maxlength="2" placeholder="SP"')}
            ${field('Cidade *', 'city', valueOf(settings, 'city'))}
            ${field('Código IBGE Cidade', 'city_ibge_code', valueOf(settings, 'city_ibge_code'))}
            ${field('Endereço *', 'address', valueOf(settings, 'address'))}
            ${field('Número', 'number', valueOf(settings, 'number'))}
            ${field('Bairro', 'neighborhood', valueOf(settings, 'neighborhood'))}
            ${field('Complemento', 'complement', valueOf(settings, 'complement'))}
            ${field('CEP *', 'zip_code', valueOf(settings, 'zip_code'))}
            ${field('Telefone', 'phone', valueOf(settings, 'phone'))}
            ${field('E-mail fiscal', 'email', valueOf(settings, 'email'), 'email')}
          </div>
        </div>

        <div class="card p-4">
          <h3 class="font-semibold text-gray-800 mb-4">Ambiente, Série e Numeração</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            ${selectField('Ambiente', 'environment', settings.environment || 'homologation', [
              { value: 'homologation', label: 'Homologação / Testes' },
              { value: 'production', label: 'Produção' }
            ])}
            <label class="flex items-center gap-2 text-sm text-gray-700 mt-7"><input type="checkbox" name="nfe_enabled" value="1" ${checked(settings, 'nfe_enabled', true)}> Habilitar NF-e</label>
            <label class="flex items-center gap-2 text-sm text-gray-700 mt-7"><input type="checkbox" name="nfce_enabled" value="1" ${checked(settings, 'nfce_enabled', true)}> Habilitar NFC-e</label>
            <label class="flex items-center gap-2 text-sm text-gray-700 mt-7"><input type="checkbox" name="contingency_enabled" value="1" ${checked(settings, 'contingency_enabled', false)}> Contingência</label>
            ${field('Série NF-e', 'nfe_series', valueOf(settings, 'nfe_series', '1'))}
            ${field('Próximo nº NF-e', 'nfe_number', valueOf(settings, 'nfe_number', '1'), 'number', 'min="1"')}
            ${field('Série NFC-e', 'nfce_series', valueOf(settings, 'nfce_series', '1'))}
            ${field('Próximo nº NFC-e', 'nfce_number', valueOf(settings, 'nfce_number', '1'), 'number', 'min="1"')}
            <div class="sm:col-span-2 lg:col-span-4"><label class="text-sm font-medium text-gray-700">Motivo de contingência</label><textarea name="contingency_reason" class="input-field mt-1" rows="2">${valueOf(settings, 'contingency_reason')}</textarea></div>
          </div>
        </div>

        <div class="card p-4">
          <h3 class="font-semibold text-gray-800 mb-4">Certificado Digital e API Fiscal</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${selectField('Tipo do Certificado', 'certificate_type', settings.certificate_type || 'a1', [
              { value: 'a1', label: 'A1 - Arquivo' },
              { value: 'a3', label: 'A3 - Token/Cartão' },
              { value: 'api', label: 'Gerenciado pela API fiscal' }
            ])}
            ${field('Caminho/identificador do certificado', 'certificate_path', valueOf(settings, 'certificate_path'))}
            ${field('Senha do certificado', 'certificate_password', valueOf(settings, 'certificate_password'), 'password')}
            ${field('Validade do certificado', 'certificate_expires_at', valueOf(settings, 'certificate_expires_at'), 'date')}
            ${selectField('Provedor/API Fiscal', 'api_provider', settings.api_provider || '', [
              { value: '', label: 'Não configurado' },
              { value: 'plugnotas', label: 'PlugNotas' },
              { value: 'focusnfe', label: 'Focus NFe' },
              { value: 'nuvem_fiscal', label: 'Nuvem Fiscal' },
              { value: 'tecnospeed', label: 'TecnoSpeed' },
              { value: 'outro', label: 'Outro' }
            ])}
            ${field('URL da API fiscal', 'api_url', valueOf(settings, 'api_url'), 'url')}
            ${field('API Key', 'api_key', valueOf(settings, 'api_key'))}
            ${field('API Secret', 'api_secret', valueOf(settings, 'api_secret'), 'password')}
            <div class="sm:col-span-2 lg:col-span-3"><label class="text-sm font-medium text-gray-700">Token/Bearer da API</label><textarea name="api_token" class="input-field mt-1" rows="2">${valueOf(settings, 'api_token')}</textarea></div>
            <div class="sm:col-span-2 lg:col-span-3">${field('Webhook de retorno da API', 'webhook_url', valueOf(settings, 'webhook_url'), 'url')}</div>
          </div>
        </div>

        <div class="card p-4">
          <h3 class="font-semibold text-gray-800 mb-4">Tributação Padrão dos Produtos</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            ${field('CFOP padrão NF-e', 'nfe_default_cfop', valueOf(settings, 'nfe_default_cfop', '5102'))}
            ${field('CFOP padrão NFC-e', 'nfce_default_cfop', valueOf(settings, 'nfce_default_cfop', '5102'))}
            ${field('NCM padrão', 'default_ncm', valueOf(settings, 'default_ncm'))}
            ${field('CEST padrão', 'default_cest', valueOf(settings, 'default_cest'))}
            ${field('CSOSN padrão', 'default_csosn', valueOf(settings, 'default_csosn', '102'))}
            ${field('CST ICMS padrão', 'default_cst_icms', valueOf(settings, 'default_cst_icms'))}
            ${field('CST PIS padrão', 'default_cst_pis', valueOf(settings, 'default_cst_pis', '07'))}
            ${field('CST COFINS padrão', 'default_cst_cofins', valueOf(settings, 'default_cst_cofins', '07'))}
            ${selectField('Origem da mercadoria', 'icms_origin', settings.icms_origin || '0', [
              { value: '0', label: '0 - Nacional' },
              { value: '1', label: '1 - Estrangeira importação direta' },
              { value: '2', label: '2 - Estrangeira mercado interno' },
              { value: '3', label: '3 - Nacional com conteúdo importado > 40%' },
              { value: '4', label: '4 - Nacional conforme PPB' },
              { value: '5', label: '5 - Nacional conteúdo importado <= 40%' },
              { value: '6', label: '6 - Estrangeira sem similar nacional' },
              { value: '7', label: '7 - Estrangeira mercado interno sem similar' },
              { value: '8', label: '8 - Nacional conteúdo importado > 70%' }
            ])}
            ${field('ID CSC NFC-e', 'csc_id', valueOf(settings, 'csc_id'))}
            ${field('Token CSC NFC-e', 'csc_token', valueOf(settings, 'csc_token'), 'password')}
          </div>
        </div>

        <div class="flex flex-col sm:flex-row justify-end gap-2">
          <button type="button" onclick="validateFiscalSettings()" class="btn-secondary">Validar Configuração</button>
          <button type="submit" class="btn-primary">Salvar Fiscal</button>
        </div>
      </form>`;
  }

  function invoiceTable(invoices = []) {
    return `
      <div class="card overflow-hidden">
        <div class="p-4 border-b flex justify-between items-center gap-3">
          <div>
            <h3 class="font-semibold text-gray-800">Notas fiscais</h3>
            <p class="text-xs text-gray-500">Histórico de NF-e/NFC-e preparadas pelo sistema.</p>
          </div>
          <button onclick="openIssueInvoiceModal()" class="btn-primary">+ Emitir por pedido</button>
        </div>
        <div class="table-container">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b"><tr><th class="text-left p-3 font-medium text-gray-600">Tipo / Número</th><th class="text-left p-3 font-medium text-gray-600 hidden sm:table-cell">Pedido</th><th class="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Cliente</th><th class="text-right p-3 font-medium text-gray-600">Valor</th><th class="text-center p-3 font-medium text-gray-600">Status</th><th class="text-center p-3 font-medium text-gray-600">Ações</th></tr></thead>
            <tbody>${invoices.map(inv => `
              <tr class="border-b hover:bg-gray-50">
                <td class="p-3"><div class="font-medium">${esc((inv.invoice_type || '').toUpperCase())} ${esc(inv.series || '1')}/${esc(inv.number || '-')}</div><div class="text-xs text-gray-500">${esc(inv.environment || '')}</div></td>
                <td class="p-3 text-gray-600 hidden sm:table-cell">${esc(inv.order_number || '-')}</td>
                <td class="p-3 text-gray-600 hidden md:table-cell">${esc(inv.customer_name || '-')}</td>
                <td class="p-3 text-right">${formatCurrency(inv.total_value)}</td>
                <td class="p-3 text-center">${statusBadge(inv.status)}</td>
                <td class="p-3 text-center"><button onclick="cancelFiscalInvoice(${Number(inv.id)})" class="text-red-600 text-xs">Cancelar</button></td>
              </tr>`).join('') || '<tr><td colspan="6" class="p-8 text-center text-gray-400">Nenhuma nota fiscal emitida</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }

  window.renderInvoices = async function renderInvoices() {
    const [invoicesData, settings] = await Promise.all([
      api('/api/fiscal/invoices'),
      api('/api/fiscal/settings')
    ]);

    const validation = settings.validation || {};
    document.getElementById('pageContent').innerHTML = `
      <div class="space-y-6">
        <div class="card p-4">
          <div class="flex flex-col lg:flex-row justify-between gap-3">
            <div>
              <h3 class="font-semibold text-gray-800">Módulo Fiscal</h3>
              <p class="text-sm text-gray-500">Configure emitente, certificado, API fiscal, numeração, NFC-e, NF-e e tributação padrão.</p>
            </div>
            <div class="flex flex-wrap gap-2 text-sm">
              <span class="badge ${settings.environment === 'production' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${settings.environment === 'production' ? 'Produção' : 'Homologação'}</span>
              <span class="badge ${validation.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${validation.valid ? 'Obrigatórios OK' : 'Pendências'}</span>
            </div>
          </div>
          <div class="mt-4">${fiscalValidationBox(validation)}</div>
        </div>
        ${fiscalSettingsForm(settings)}
        ${invoiceTable(invoicesData.invoices || [])}
        <div id="fiscalModal"></div>
      </div>`;
  };

  window.saveFiscalSettings = async function saveFiscalSettings(event) {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form));
    ['nfe_enabled', 'nfce_enabled', 'contingency_enabled', 'sync_company'].forEach(name => {
      data[name] = form.elements[name] && form.elements[name].checked ? '1' : '0';
    });

    try {
      await api('/api/fiscal/settings', { method: 'PUT', body: JSON.stringify(data) });
      toast('Configuração fiscal salva');
      renderInvoices();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  window.validateFiscalSettings = async function validateFiscalSettings() {
    try {
      const result = await api('/api/fiscal/settings/validate');
      const msg = result.valid ? 'Configuração obrigatória OK' : `Pendências: ${(result.missing || []).join(', ')}`;
      toast(msg, result.valid ? 'success' : 'error');
      renderInvoices();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  window.openIssueInvoiceModal = async function openIssueInvoiceModal() {
    const orders = await api('/api/fiscal/orders/eligible');
    document.getElementById('fiscalModal').innerHTML = `
      <div class="modal-overlay" onclick="if(event.target===this)this.remove()">
        <div class="modal-content">
          <h3 class="text-lg font-semibold mb-4">Emitir nota por pedido</h3>
          <form onsubmit="issueFiscalInvoice(event)">
            <div class="space-y-3">
              <div><label class="text-sm font-medium text-gray-700">Tipo de nota</label><select name="invoice_type" class="input-field mt-1"><option value="nfce">NFC-e consumidor</option><option value="nfe">NF-e</option></select></div>
              <div><label class="text-sm font-medium text-gray-700">Pedido</label><select name="order_id" class="input-field mt-1" required>${orders.map(o => `<option value="${Number(o.id)}">${esc(o.order_number || o.id)} - ${esc(o.customer_name || 'Cliente')} - ${formatCurrency(o.total)}</option>`).join('')}</select></div>
              ${orders.length ? '' : '<p class="text-sm text-gray-500">Nenhum pedido disponível para emissão.</p>'}
            </div>
            <div class="flex justify-end gap-2 mt-4"><button type="button" onclick="this.closest(\'.modal-overlay\').remove()" class="btn-secondary">Cancelar</button><button type="submit" class="btn-primary" ${orders.length ? '' : 'disabled'}>Preparar Nota</button></div>
          </form>
        </div>
      </div>`;
  };

  window.issueFiscalInvoice = async function issueFiscalInvoice(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    try {
      await api('/api/fiscal/issue', { method: 'POST', body: JSON.stringify(data) });
      toast('Nota fiscal preparada');
      document.querySelector('.modal-overlay')?.remove();
      renderInvoices();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  window.cancelFiscalInvoice = async function cancelFiscalInvoice(id) {
    const reason = prompt('Motivo do cancelamento:');
    if (reason === null) return;
    try {
      await api(`/api/fiscal/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
      toast('Nota cancelada');
      renderInvoices();
    } catch (err) {
      toast(err.message, 'error');
    }
  };
})();
