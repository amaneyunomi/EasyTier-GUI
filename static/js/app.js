
// 页面切换逻辑
document.querySelectorAll('nav ul li a').forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    const target = this.getAttribute('href').substring(1);
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.querySelectorAll('nav ul li a').forEach(link => {
      link.classList.remove('active');
    });
    document.getElementById(target).classList.add('active');
    this.classList.add('active');
  });
});

// 显示连接信息
ipcRenderer.on('connection-status', (event, status) => {
  document.getElementById('connection-status').innerHTML = `<p>${status}</p>`;
});

// 显示节点信息
ipcRenderer.on('peers-output', (event, data) => {
  document.getElementById('peers-list').innerHTML = `<pre>${data}</pre>`;
});
