// ==========================================
// 1. CONFIGURE YOUR RECEIVERS HERE
// ==========================================
const STORE_CONFIG = {
  googleSheetUrl: "https://script.google.com/macros/s/AKfycbyvWqPvoGLYWQgAhlkJVqxIeU9qGn2tGst-aDsumzuHzRa-9pM5Gzke3Dw3IKFBobA/exec",
  whatsappNumber: "919876543210" // Replace with 91 + your 10-digit WhatsApp number
};

let products = [];
let activeCategory = "All";
let selectedProduct = null;
let orderQty = 1;
let paymentMode = "COD";
let onlineSubMethod = "UPI ID";
let placedOrders = [];

// Load products dynamically from products.json
async function loadProducts() {
  const grid = document.getElementById("productsGrid");
  const showAllBtn = document.getElementById("showAllBtn");

  try {
    const response = await fetch("products.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    products = Array.isArray(data) ? data : [];
    showAllBtn.textContent = `Show All (${products.length})`;
    renderProducts(products);
  } catch (error) {
    grid.innerHTML = `<p class="grid-status-msg">Unable to load products.json. Make sure you are running on a local server or GitHub Pages.</p>`;
  }
}

function renderProducts(list) {
  const grid = document.getElementById("productsGrid");

  if (products.length === 0) {
    grid.innerHTML = `<p class="grid-status-msg">No products added yet. Add your items inside <strong>products.json</strong> to display them here.</p>`;
    return;
  }

  if (list.length === 0) {
    grid.innerHTML = `<p class="grid-status-msg">No offerings match your current search or category filter.</p>`;
    return;
  }

  grid.innerHTML = list.map(item => {
    const priceFormatted = Number(item.price || 0).toLocaleString("en-IN");
    const swatchesHtml = Array.isArray(item.swatches)
      ? item.swatches.map(color => `<span class="swatch" style="background:${color}"></span>`).join("")
      : "";

    return `
      <article class="product-card">
        <div class="product-media">
          ${item.tag ? `<span class="product-tag">${item.tag}</span>` : ""}
          <button class="wishlist-btn" onclick="this.classList.toggle('active')" aria-label="Save item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <img src="${item.image}" alt="${item.name}">
        </div>
        <h3 class="product-title">${item.name}</h3>
        <div class="product-meta">${item.subtitle || ""}</div>
        <div class="product-price-row">
          <span class="product-price">₹${priceFormatted}</span>
          <div class="swatches">${swatchesHtml}</div>
        </div>
        <button class="buy-now-btn" onclick="openCheckout(${item.id})">Buy Now</button>
      </article>
    `;
  }).join("");
}

function filterProducts() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();
  const filtered = products.filter(p => {
    const matchesCat = activeCategory === "All" || p.category === activeCategory;
    const matchesText =
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.category && p.category.toLowerCase().includes(query)) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(query));
    return matchesCat && matchesText;
  });
  renderProducts(filtered);
}

function selectCategory(category, element) {
  activeCategory = category;
  document.getElementById("gridHeading").textContent = category === "All" ? "Sacred Offerings" : category;
  document.querySelectorAll(".cat-item").forEach(el => el.classList.remove("active"));
  if (element) {
    element.classList.add("active");
  }
  filterProducts();
  scrollToProducts();
}

function resetFilters() {
  activeCategory = "All";
  document.getElementById("searchInput").value = "";
  document.getElementById("gridHeading").textContent = "Sacred Offerings";
  document.querySelectorAll(".cat-item").forEach((el, idx) => {
    el.classList.toggle("active", idx === 0);
  });
  renderProducts(products);
}

function scrollToProducts() {
  document.getElementById("featuredSection").scrollIntoView({ behavior: "smooth" });
}

// Checkout Drawer Logic
function openCheckout(productId) {
  selectedProduct = products.find(p => p.id === productId);
  if (!selectedProduct) return;

  orderQty = 1;
  paymentMode = "COD";

  document.getElementById("checkoutFormView").style.display = "block";
  document.getElementById("drawerFooter").style.display = "block";
  document.getElementById("confirmationView").classList.remove("active");
  document.getElementById("drawerTitle").textContent = "Complete Offering";

  document.getElementById("modalProductImg").src = selectedProduct.image;
  document.getElementById("modalProductName").textContent = selectedProduct.name;
  document.getElementById("modalProductMeta").textContent = selectedProduct.subtitle || selectedProduct.category;
  document.getElementById("modalUnitPrice").textContent = `₹${Number(selectedProduct.price).toLocaleString("en-IN")}`;

  selectPaymentMode("COD");
  updateBilling();
  document.getElementById("checkoutBackdrop").classList.add("open");
}

function closeCheckout() {
  document.getElementById("checkoutBackdrop").classList.remove("open");
}

function closeDrawerOnOutside(e) {
  if (e.target.id === "checkoutBackdrop") {
    closeCheckout();
  }
}

function changeQty(delta) {
  orderQty = Math.max(1, Math.min(20, orderQty + delta));
  updateBilling();
}

function selectPaymentMode(mode) {
  paymentMode = mode;
  const codEl = document.getElementById("optCod");
  const onlineEl = document.getElementById("optOnline");
  const onlinePanel = document.getElementById("onlinePayPanel");
  const upiInput = document.getElementById("upiInput");

  if (mode === "COD") {
    codEl.classList.add("selected");
    onlineEl.classList.remove("selected");
    onlinePanel.classList.remove("visible");
    upiInput.required = false;
  } else {
    onlineEl.classList.add("selected");
    codEl.classList.remove("selected");
    onlinePanel.classList.add("visible");
    upiInput.required = true;
  }
  updateBilling();
}

function selectOnlineSub(method, btn) {
  onlineSubMethod = method;
  document.querySelectorAll(".upi-chip").forEach(c => c.classList.remove("active"));
  btn.classList.add("active");

  const label = document.getElementById("onlineInputLabel");
  const input = document.getElementById("upiInput");
  if (method === "UPI ID") {
    label.textContent = "Enter UPI ID (GPay / PhonePe / Paytm)";
    input.placeholder = "yourname@okaxis";
  } else if (method === "Card") {
    label.textContent = "Enter Card Number (Last 4 digits for demo)";
    input.placeholder = "XXXX XXXX XXXX 4242";
  } else {
    label.textContent = "Enter Bank Name";
    input.placeholder = "State Bank of India / HDFC";
  }
}

function updateBilling() {
  if (!selectedProduct) return;
  document.getElementById("modalQty").textContent = orderQty;

  const subtotal = Number(selectedProduct.price) * orderQty;
  const shipping = subtotal >= 999 ? 0 : 60;
  const total = subtotal + shipping;

  document.getElementById("billSubtotal").textContent = `₹${subtotal.toLocaleString("en-IN")}`;
  document.getElementById("billShipping").textContent = shipping === 0 ? "Free" : `₹${shipping}`;
  document.getElementById("billTotal").textContent = `₹${total.toLocaleString("en-IN")}`;

  const btn = document.getElementById("submitOrderBtn");
  btn.textContent = paymentMode === "COD"
    ? `Place COD Order · ₹${total.toLocaleString("en-IN")}`
    : `Pay ₹${total.toLocaleString("en-IN")} & Buy Now`;
}

async function handleOrderSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("submitOrderBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Recording Order...";

  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const pin = document.getElementById("custPin").value.trim();
  const upiVal = document.getElementById("upiInput").value.trim();

  const subtotal = Number(selectedProduct.price) * orderQty;
  const shipping = subtotal >= 999 ? 0 : 60;
  const total = subtotal + shipping;
  const orderNum = "STV-" + Math.floor(1000 + Math.random() * 9000);
  const paymentDetail = paymentMode === "COD" ? "Cash on Delivery" : `${onlineSubMethod}: ${upiVal}`;

  const orderPayload = {
    orderNum,
    name,
    phone,
    address,
    pin,
    product: selectedProduct.name,
    qty: orderQty,
    total,
    paymentMode,
    paymentDetail
  };

  // 1. Send order to Google Sheets
  if (STORE_CONFIG.googleSheetUrl) {
    try {
      await fetch(STORE_CONFIG.googleSheetUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(orderPayload)
      });
    } catch (err) {
      console.error("Sheet logging failed:", err);
    }
  }

  placedOrders.push(orderPayload);
  document.getElementById("orderCountBadge").textContent = placedOrders.length;

  // 2. Build WhatsApp message URL
  const waText = [
    `*NEW ORDER: #${orderNum}*`,
    `Item: ${orderQty} x ${selectedProduct.name}`,
    `Total: Rs. ${total.toLocaleString("en-IN")}`,
    `Payment: ${paymentDetail}`,
    `---`,
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Address: ${address} - ${pin}`
  ].join("\n");

  const waLink = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(waText)}`;

  // 3. Show Receipt inside Drawer + WhatsApp Confirm Button
  document.getElementById("checkoutFormView").style.display = "none";
  document.getElementById("drawerFooter").style.display = "none";
  document.getElementById("drawerTitle").textContent = "Receipt";
  document.getElementById("confirmedOrderId").textContent = `ORDER #${orderNum}`;

  const modeDescription = paymentMode === "COD"
    ? `Cash on Delivery of <strong>₹${total.toLocaleString("en-IN")}</strong> will be collected upon delivery.`
    : `Online payment of <strong>₹${total.toLocaleString("en-IN")}</strong> via <strong>${onlineSubMethod}</strong> has been recorded.`;

  document.getElementById("confirmedSummaryText").innerHTML = `
    Thank you, <strong>${name}</strong>. Your order for <strong>${orderQty} &times; ${selectedProduct.name}</strong> has been logged.<br><br>
    ${modeDescription}<br><br>
    Dispatching to: ${address} - ${pin} (${phone}).<br><br>
    <a href="${waLink}" target="_blank" rel="noopener" class="btn-primary" style="display:block; text-align:center; margin-top:12px;">
      Send Confirmation on WhatsApp
    </a>
  `;

  document.getElementById("confirmationView").classList.add("active");
  submitBtn.disabled = false;

  // Automatically open WhatsApp in a new tab
  if (STORE_CONFIG.whatsappNumber && STORE_CONFIG.whatsappNumber !== "919945243930") {
    window.open(waLink, "_blank", "noopener");
  }
}

function showRecentOrder() {
  if (placedOrders.length === 0) {
    alert("No orders placed yet. Click 'Buy Now' on any offering to begin.");
    return;
  }
  const last = placedOrders[placedOrders.length - 1];
  alert(`Latest Order: #${last.orderNum}\nItem: ${last.qty}x ${last.product}\nTotal: ₹${last.total}\nMode: ${last.paymentMode}`);
}

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// Initialize storefront
loadProducts();
