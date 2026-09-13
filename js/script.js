'use strict';

const NetworkLab = {
  devices: [],
  alerts: [],
  lastVerification: null,
  editingId: null,

  init() {
    this.loadData();
    this.bindEvents();
    this.updateClock();
    this.renderAll();

    setInterval(() => this.updateClock(), 1000);
  },

  loadData() {
    try {
      this.devices =
        JSON.parse(localStorage.getItem('invictus_network_devices')) || [];

      this.alerts =
        JSON.parse(localStorage.getItem('invictus_network_alerts')) || [];
    } catch (error) {
      this.devices = [];
      this.alerts = [];
    }

    if (!this.devices.length) {
      this.devices = [
        {
          id: this.generateId(),
          name: 'Roteador Principal',
          ip: '192.168.1.1',
          type: 'Roteador',
          status: 'online'
        },
        {
          id: this.generateId(),
          name: 'Firewall Corporativo',
          ip: '192.168.1.2',
          type: 'Firewall',
          status: 'online'
        },
        {
          id: this.generateId(),
          name: 'Switch Core',
          ip: '192.168.1.10',
          type: 'Switch',
          status: 'online'
        },
        {
          id: this.generateId(),
          name: 'Servidor Windows',
          ip: '192.168.1.20',
          type: 'Servidor',
          status: 'online'
        }
      ];
    }

    if (!this.alerts.length) {
      this.alerts = [
        {
          id: this.generateId(),
          title: 'Sistema inicializado',
          message: 'Monitoramento iniciado.',
          severity: 'success',
          createdAt: this.now()
        }
      ];
    }

    this.saveData();
  },

  saveData() {
    localStorage.setItem(
      'invictus_network_devices',
      JSON.stringify(this.devices)
    );

    localStorage.setItem(
      'invictus_network_alerts',
      JSON.stringify(this.alerts)
    );
  },

  generateId() {
    return Date.now() + Math.floor(Math.random() * 10000);
  },

  now() {
    return new Date().toLocaleString('pt-BR');
  },

  el(id) {
    return document.getElementById(id);
  },

  text(id, value) {
    const element = this.el(id);

    if (element) {
      element.textContent = value;
    }
  },

  bindEvents() {
    document.querySelectorAll('.nav-link').forEach(button => {
      button.addEventListener('click', () => {
        this.showSection(button.dataset.section);
      });
    });

    this.el('mobileMenuButton')?.addEventListener('click', () => {
      this.el('sidebar')?.classList.toggle('open');
    });

    this.el('themeToggle')?.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
    });

    ['topbarHealthCheck', 'runHealthCheck'].forEach(id => {
      this.el(id)?.addEventListener('click', () => {
        this.verifyNetwork();
      });
    });

    this.el('newDeviceButton')?.addEventListener('click', () => {
      this.openDeviceForm();
    });

    this.el('cancelDeviceButton')?.addEventListener('click', () => {
      this.closeDeviceForm();
    });

    this.el('deviceForm')?.addEventListener('submit', event => {
      event.preventDefault();
      this.saveDeviceFromForm();
    });

    ['deviceStatusFilter', 'deviceTypeFilter'].forEach(id => {
      this.el(id)?.addEventListener('change', () => {
        this.renderDevices();
      });
    });

    this.el('diagnosticForm')?.addEventListener('submit', event => {
      event.preventDefault();
      this.diagnoseIp();
    });

    this.el('subnetForm')?.addEventListener('submit', event => {
      event.preventDefault();
      this.calculateSubnet();
    });

    this.el('clearAlertsButton')?.addEventListener('click', () => {
      this.alerts = [];
      this.saveData();
      this.renderAlerts();
      this.renderStatistics();
    });

    document.addEventListener('click', event => {
      const editButton = event.target.closest('[data-edit-device]');

      if (editButton) {
        this.editDevice(Number(editButton.dataset.editDevice));
      }

      const deleteButton = event.target.closest('[data-delete-device]');

      if (deleteButton) {
        this.deleteDevice(Number(deleteButton.dataset.deleteDevice));
      }

      const deleteAlertButton = event.target.closest('[data-delete-alert]');

      if (deleteAlertButton) {
        this.deleteAlert(Number(deleteAlertButton.dataset.deleteAlert));
      }
    });
  },

  showSection(name) {
    document.querySelectorAll('section[id^="section-"]').forEach(section => {
      section.hidden = section.id !== `section-${name}`;
    });

    document.querySelectorAll('.nav-link').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.section === name
      );
    });

    const titles = {
      dashboard: 'Dashboard',
      devices: 'Dispositivos',
      diagnostic: 'Diagnóstico IPv4',
      subnets: 'Sub-redes',
      commands: 'Comandos',
      alerts: 'Alertas'
    };

    this.text('pageHeading', titles[name] || 'Dashboard');
  },

  updateClock() {
    const date = new Date();

    this.text(
      'currentTime',
      date.toLocaleTimeString('pt-BR')
    );

    this.text(
      'currentDate',
      date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    );
  },

  renderAll() {
    this.renderStatistics();
    this.renderDevices();
    this.renderAlerts();
    this.updateInfrastructureStatus();
  },

  renderStatistics() {
    const total = this.devices.length;

    const online = this.devices.filter(
      device => device.status === 'online'
    ).length;

    this.text('totalDevices', total);
    this.text('onlineDevices', online);
    this.text('totalAlerts', this.alerts.length);

    this.text(
      'availability',
      total ? `${Math.round((online / total) * 100)}%` : '0%'
    );
  },

  renderDevices() {
    const tableBody = this.el('devicesTableBody');

    if (!tableBody) {
      return;
    }

    const selectedStatus =
      this.el('deviceStatusFilter')?.value || 'all';

    const selectedType =
      this.el('deviceTypeFilter')?.value || 'all';

    const filteredDevices = this.devices.filter(device => {
      const matchesStatus =
        selectedStatus === 'all' ||
        !selectedStatus ||
        device.status === selectedStatus;

      const matchesType =
        selectedType === 'all' ||
        !selectedType ||
        device.type === selectedType;

      return matchesStatus && matchesType;
    });

    if (!filteredDevices.length) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            Nenhum dispositivo encontrado.
          </td>
        </tr>
      `;

      return;
    }

    tableBody.innerHTML = filteredDevices
      .map(device => {
        const statusLabel = {
          online: 'Online',
          offline: 'Offline',
          attention: 'Atenção'
        }[device.status] || device.status;

        const statusClass = {
          online: 'success',
          offline: 'danger',
          attention: 'warning'
        }[device.status] || '';

        return `
          <tr>
            <td>${this.escape(device.name)}</td>

            <td>
              <code>${this.escape(device.ip)}</code>
            </td>

            <td>${this.escape(device.type)}</td>

            <td>
              ${this.escape(device.location || 'Não informado')}
            </td>

            <td>
              <span class="badge ${statusClass}">
                ${statusLabel}
              </span>
            </td>

            <td>
              <button
                class="secondary"
                data-edit-device="${device.id}">
                Editar
              </button>

              <button
                class="danger"
                data-delete-device="${device.id}">
                Excluir
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  },
    openDeviceForm() {
    this.el('deviceFormCard')?.removeAttribute('hidden');

    this.el('deviceForm')?.reset();

    this.editingId = null;
  },

  closeDeviceForm() {
    this.el('deviceFormCard')?.setAttribute('hidden', '');

    this.editingId = null;
  },

  saveDeviceFromForm() {
    const name = this.el('deviceName')?.value.trim();
    const ip = this.el('deviceIp')?.value.trim();
    const type = this.el('deviceType')?.value || 'Computador';
    const status = this.el('deviceStatus')?.value || 'online';

    if (!name || !this.isValidIPv4(ip)) {
      alert('Preencha o nome e informe um endereço IPv4 válido.');
      return;
    }

    if (this.editingId) {
      const device = this.devices.find(
        item => item.id === this.editingId
      );

      if (device) {
        device.name = name;
        device.ip = ip;
        device.type = type;
        device.status = status;
      }
    } else {
      this.devices.push({
        id: this.generateId(),
        name,
        ip,
        type,
        status
      });

      this.alerts.unshift({
        id: this.generateId(),
        title: 'Novo dispositivo cadastrado',
        message: `${name} foi adicionado à infraestrutura.`,
        severity: 'success',
        createdAt: this.now()
      });
    }

    this.saveData();
    this.renderAll();
    this.closeDeviceForm();
  },

  editDevice(id) {
    const device = this.devices.find(
      item => item.id === id
    );

    if (!device) {
      return;
    }

    this.editingId = id;

    this.el('deviceFormCard')?.removeAttribute('hidden');

    const fields = {
      deviceName: device.name,
      deviceIp: device.ip,
      deviceType: device.type,
      deviceStatus: device.status
    };

    Object.entries(fields).forEach(([fieldId, value]) => {
      const field = this.el(fieldId);

      if (field) {
        field.value = value || '';
      }
    });
  },

  deleteDevice(id) {
    const device = this.devices.find(
      item => item.id === id
    );

    if (!device) {
      return;
    }

    const confirmed = confirm(
      `Deseja excluir o dispositivo "${device.name}"?`
    );

    if (!confirmed) {
      return;
    }

    this.devices = this.devices.filter(
      item => item.id !== id
    );

    this.alerts.unshift({
      id: this.generateId(),
      title: 'Dispositivo removido',
      message: `${device.name} foi removido da infraestrutura.`,
      severity: 'warning',
      createdAt: this.now()
    });

    this.saveData();
    this.renderAll();
  },

  verifyNetwork() {
    this.text('networkStatus', 'Verificando...');

    setTimeout(() => {
      const total = this.devices.length;

      const online = this.devices.filter(
        device => device.status === 'online'
      ).length;

      const offline = this.devices.filter(
        device => device.status === 'offline'
      ).length;

      const attention = this.devices.filter(
        device => device.status === 'attention'
      ).length;

      this.lastVerification = new Date();

      const message =
        `${online} online, ` +
        `${offline} offline e ` +
        `${attention} em atenção.`;

      this.alerts.unshift({
        id: this.generateId(),
        title: 'Verificação de rede concluída',
        message,
        severity:
          offline > 0 || attention > 0
            ? 'warning'
            : 'success',
        createdAt: this.now()
      });

      this.alerts = this.alerts.slice(0, 20);

      this.saveData();
      this.renderAll();

      this.text('lastCheck', this.now());

      this.text(
        'networkStatus',
        offline > 0 || attention > 0
          ? 'Atenção'
          : 'Operacional'
      );
    }, 700);
  },

  diagnoseIp() {
    const ip = this.el('ipInput')?.value.trim();

    const prefixValue = this.el('maskInput')?.value;

    const prefix = Number(prefixValue);

    if (!this.isValidIPv4(ip)) {
      this.showResult(
        'diagnosticResult',
        'Informe um endereço IPv4 válido.'
      );

      return;
    }

    if (
      !Number.isInteger(prefix) ||
      prefix < 0 ||
      prefix > 32
    ) {
      this.showResult(
        'diagnosticResult',
        'Informe um prefixo entre 0 e 32.'
      );

      return;
    }

    const result = this.calculateNetwork(ip, prefix);

    this.text('resultIp', result.ip);
    this.text('resultMask', result.mask);
    this.text('resultNetwork', result.network);
    this.text('resultBroadcast', result.broadcast);
    this.text('resultFirstHost', result.firstHost);
    this.text('resultLastHost', result.lastHost);
    this.text('resultHostCount', result.hosts);
    this.text('resultClass', result.ipClass);

    this.el('diagnosticResult')?.removeAttribute('hidden');
  },

  calculateSubnet() {
    const network = this.el('subnetNetwork')?.value.trim();

    const prefix = Number(
      this.el('subnetPrefix')?.value
    );

    if (!this.isValidIPv4(network)) {
      this.showResult(
        'subnetResult',
        'Informe um endereço de rede IPv4 válido.'
      );

      return;
    }

    if (
      !Number.isInteger(prefix) ||
      prefix < 0 ||
      prefix > 32
    ) {
      this.showResult(
        'subnetResult',
        'Informe um prefixo entre 0 e 32.'
      );

      return;
    }

    const result = this.calculateNetwork(network, prefix);

    const output = this.el('subnetOutput');

    if (output) {
      output.textContent =
        `Rede: ${result.network}\n` +
        `Máscara: ${result.mask}\n` +
        `Prefixo: /${prefix}\n` +
        `Broadcast: ${result.broadcast}\n` +
        `Primeiro host: ${result.firstHost}\n` +
        `Último host: ${result.lastHost}\n` +
        `Total de endereços: ${result.totalAddresses}\n` +
        `Hosts utilizáveis: ${result.hosts}`;
    }

    this.el('subnetResult')?.removeAttribute('hidden');
  },

  calculateNetwork(ip, cidr) {
    const ipNumber = this.ipToNumber(ip);

    const maskNumber =
      cidr === 0
        ? 0
        : (0xffffffff << (32 - cidr)) >>> 0;

    const networkNumber =
      (ipNumber & maskNumber) >>> 0;

    const broadcastNumber =
      (networkNumber | (~maskNumber >>> 0)) >>> 0;

    const totalAddresses = 2 ** (32 - cidr);

    const hosts =
      cidr >= 31
        ? totalAddresses
        : Math.max(totalAddresses - 2, 0);

    const firstHost =
      cidr >= 31
        ? networkNumber
        : networkNumber + 1;

    const lastHost =
      cidr >= 31
        ? broadcastNumber
        : broadcastNumber - 1;

    return {
      ip,
      mask: this.numberToIp(maskNumber),
      network: this.numberToIp(networkNumber),
      broadcast: this.numberToIp(broadcastNumber),
      firstHost: this.numberToIp(firstHost),
      lastHost: this.numberToIp(lastHost),
      totalAddresses,
      hosts,
      ipClass: this.getIpClass(ip)
    };
  },

  ipToNumber(ip) {
    const octets = ip.split('.').map(Number);

    return (
      (
        (octets[0] << 24) >>> 0
      ) +
      (octets[1] << 16) +
      (octets[2] << 8) +
      octets[3]
    ) >>> 0;
  },

  numberToIp(number) {
    return [
      (number >>> 24) & 255,
      (number >>> 16) & 255,
      (number >>> 8) & 255,
      number & 255
    ].join('.');
  },

  getIpClass(ip) {
    const firstOctet = Number(
      ip.split('.')[0]
    );

    if (firstOctet >= 1 && firstOctet <= 126) {
      return 'Classe A';
    }

    if (firstOctet >= 128 && firstOctet <= 191) {
      return 'Classe B';
    }

    if (firstOctet >= 192 && firstOctet <= 223) {
      return 'Classe C';
    }

    if (firstOctet >= 224 && firstOctet <= 239) {
      return 'Classe D';
    }

    if (firstOctet >= 240 && firstOctet <= 255) {
      return 'Classe E';
    }

    return 'Reservado';
  },

  isValidIPv4(ip) {
    if (typeof ip !== 'string') {
      return false;
    }

    const octets = ip.trim().split('.');

    return (
      octets.length === 4 &&
      octets.every(octet => {
        return (
          /^\d+$/.test(octet) &&
          Number(octet) >= 0 &&
          Number(octet) <= 255
        );
      })
    );
  },

  renderAlerts() {
    const alertsList = this.el('alertsList');

    if (!alertsList) {
      return;
    }

    if (!this.alerts.length) {
      alertsList.innerHTML =
        '<p>Nenhum alerta registrado.</p>';

      return;
    }

    alertsList.innerHTML = this.alerts
      .map(alert => {
        return `
          <div class="alert-item">
            <strong>
              ${this.escape(alert.title)}
            </strong>

            <p>
              ${this.escape(alert.message)}
            </p>

            <small>
              ${this.escape(alert.createdAt)}
            </small>

            <button
              data-delete-alert="${alert.id}">
              Excluir
            </button>
          </div>
        `;
      })
      .join('');
  },

  deleteAlert(id) {
    this.alerts = this.alerts.filter(
      alert => alert.id !== id
    );

    this.saveData();
    this.renderAlerts();
    this.renderStatistics();
  },

  updateInfrastructureStatus() {
    const hasProblems = this.devices.some(
      device => device.status !== 'online'
    );

    this.text(
      'networkStatus',
      hasProblems
        ? 'Atenção'
        : 'Operacional'
    );
  },

  showResult(id, message) {
    const element = this.el(id);

    if (!element) {
      return;
    }

    element.textContent = message;
    element.removeAttribute('hidden');
  },

  escape(value) {
    return String(value ?? '').replace(
      /[&<>'"]/g,
      character => {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[character];
      }
    );
  }
};

document.addEventListener('DOMContentLoaded', () => {
  NetworkLab.init();
});