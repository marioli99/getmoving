/* Reduz a foto antes de enviar: economiza armazenamento e evita
   upload travando em conexão de celular. */
export function comprimir(arquivo, ladoMax = 1280, qualidade = 0.82) {
  return new Promise((resolve, reject) => {
    if (!arquivo.type.startsWith("image/")) return reject(new Error("Isso não é uma imagem."));
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    leitor.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida."));
      img.onload = () => {
        const esc = Math.min(ladoMax / img.width, ladoMax / img.height, 1);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * esc);
        c.height = Math.round(img.height * esc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao converter."))),
          "image/jpeg",
          qualidade
        );
      };
      img.src = ev.target.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

/* Recorte quadrado central, para foto de perfil */
export function comprimirQuadrado(arquivo, lado = 400, qualidade = 0.85) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error("Não consegui ler o arquivo."));
    leitor.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida."));
      img.onload = () => {
        const menor = Math.min(img.width, img.height);
        const sx = (img.width - menor) / 2;
        const sy = (img.height - menor) / 2;
        const c = document.createElement("canvas");
        c.width = c.height = lado;
        c.getContext("2d").drawImage(img, sx, sy, menor, menor, 0, 0, lado, lado);
        c.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao converter."))),
          "image/jpeg",
          qualidade
        );
      };
      img.src = ev.target.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}
