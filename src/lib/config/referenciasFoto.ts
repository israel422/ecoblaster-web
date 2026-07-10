export interface ReferenciaFoto {
  imagem: string;
  titulo: string;
  instrucao: string;
}

// Fotos obrigatórias que mostram uma imagem de exemplo (5s) antes de abrir a
// câmera, pra orientar o operador. Chave = label exato usado em fotosConfig.ts.
export const REFERENCIAS_FOTO: Record<string, ReferenciaFoto> = {
  "Antes de explorar o solo": {
    imagem: "/referencias/antes-de-explorar-o-solo.jpg",
    titulo: "Antes de explorar o solo",
    instrucao: "Aponte a câmera diretamente para o chão, como no exemplo abaixo.",
  },
  "Durante a exploracao": {
    imagem: "/referencias/durante-a-exploracao.jpg",
    titulo: "Durante a exploração",
    instrucao: "Aponte a câmera para a retroescavadeira durante a execução da cava, como no exemplo abaixo.",
  },
  "Cava pronta": {
    imagem: "/referencias/cava-pronta.jpg",
    titulo: "Cava pronta",
    instrucao: "Aponte a câmera diretamente para dentro da cava já pronta, como no exemplo abaixo.",
  },
  "Cava pronta com trena medindo a largura": {
    imagem: "/referencias/cava-pronta-largura.jpg",
    titulo: "Cava pronta com trena medindo a largura",
    instrucao: "Meça a largura interna da cava com a trena e fotografe como no exemplo abaixo.",
  },
  "Cava pronta com trena medindo a profundidade": {
    imagem: "/referencias/cava-pronta-profundidade.jpg",
    titulo: "Cava pronta com trena medindo a profundidade",
    instrucao: "Meça a profundidade interna da cava com a trena e fotografe como no exemplo abaixo.",
  },
};
