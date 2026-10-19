# Sorriso Mágico 3D

Protótipo educativo de alta fidelidade para a disciplina de **Odontopediatria**: a criança explora uma boca
infantil em 3D, aprende o que é o biofilme dentário e cumpre uma missão cronometrada de escovação para ganhar
a **Medalha Sorriso de Ouro**.

Feito só com HTML, CSS e JavaScript (módulos ES). Sem build, sem dependências para instalar.

## O que é real e o que é demonstrativo

| Item | Situação |
| --- | --- |
| Boca 3D (gengiva, língua, lábios, 20 dentes de leite) | **Real**: geometria 3D gerada por código com Three.js. É estilizada, não um escaneamento anatômico. |
| Girar, vistas (frente, laterais, superior) | **Real**: arrastar, setas e botões de vista. |
| Biofilme e remoção gradual | **Real**: shader por dente; some conforme a escova passa sobre cada superfície. |
| Cronômetro, progresso, pausa, vitória/derrota | **Real**: a vitória depende do progresso de limpeza das 3 regiões dentro de 2:00. |
| Medalha | Concedida automaticamente só na vitória. O contador de medalhas fica no `localStorage` do aparelho. |
| Mascote e medalha | Ilustrações em SVG com aparência 3D estilizada. **Não** são modelos 3D. |
| Modelo GLB/glTF externo | **Não implementado.** A boca é procedural. Para trocar por um GLB, substitua a construção em `js/mouth3d.js` por um `GLTFLoader` e mantenha a mesma interface exportada. |

## Rodar localmente

Módulos ES exigem servidor HTTP (não abre por `file://`):

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Parâmetro útil para apresentação/testes: `?tempo=30` muda a duração da missão (em segundos).

## Publicar no GitHub Pages

1. Crie o repositório e envie estes arquivos para a branch `main`.
2. No GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Escolha **main** e a pasta **/ (root)** e salve.
4. Em alguns minutos o site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

O Three.js está em `vendor/`, então o site não depende de CDN. Só as fontes vêm do Google Fonts
(se ficarem indisponíveis, o layout usa fontes arredondadas do sistema).

## Estrutura

```
index.html          telas (boas-vindas, exploração, regiões, missão, sucesso, medalha, tentar de novo)
css/styles.css      tokens, componentes (botões, cards, chips, abas, medidor) e telas
js/main.js          navegação e ligação entre módulos
js/mouth3d.js       cena 3D, câmera orbital, biofilme (shader) e escovação por raycast
js/game.js          cronômetro, progresso, pausa, feedbacks e escova virtual
js/content.js       textos educativos
js/mascot.js        mascote e medalha (SVG)
js/confetti.js      confetes da tela de sucesso
vendor/             three.module.min.js (r160, MIT)
```

## Como jogar

Na missão, arraste (dedo ou mouse pressionado) a escova sobre o biofilme amarelo. Use as setas para girar
a boca e alcançar os lados e o topo dos dentes. Limpe **frente, lado esquerdo e lado direito** antes do tempo acabar.

## Observações pedagógicas

Os textos usam linguagem positiva, sem medo, culpa ou vergonha, e reforçam a supervisão de um adulto.
O conteúdo é um apoio lúdico e não substitui a orientação de um cirurgião-dentista.
