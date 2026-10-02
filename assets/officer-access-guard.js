(() => {
  const box = document.getElementById('unauthorisedBox');
  const authText = document.getElementById('authText');

  if (!box) return;

  const renderDeniedState = () => {
    if (box.hidden) return;

    box.innerHTML = `
      <div class="notice error" style="margin-top:14px">
        This Discord account is not authorised for officer access.
      </div>
      <p class="help" style="margin-top:12px">
        If you are looking to join Oh Duck It, please use the Recruitment page.
        Officer access is granted internally by the Tavern Council.
      </p>
      <div class="actions" style="justify-content:flex-start">
        <a class="btn primary" href="recruitment.html">Go to Recruitment</a>
        <a class="btn" href="index.html">Return Home</a>
      </div>`;

    if (authText) {
      authText.textContent =
        'Signed in with Discord. This account does not have Officer Portal access.';
    }
  };

  const observer = new MutationObserver(renderDeniedState);
  observer.observe(box, {
    attributes:true,
    attributeFilter:['hidden'],
    childList:true,
    subtree:true
  });

  renderDeniedState();
})();