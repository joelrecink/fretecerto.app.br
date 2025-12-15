import { Truck, Instagram, Linkedin, Facebook } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    services: [
      { name: "Transporte Rodoviário", href: "#" },
      { name: "Carga Expressa", href: "#" },
      { name: "Armazenagem", href: "#" },
      { name: "Rastreamento", href: "#" },
    ],
    company: [
      { name: "Sobre Nós", href: "#about" },
      { name: "Carreiras", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Contato", href: "#contact" },
    ],
    social: [
      { name: "Instagram", icon: Instagram, href: "#" },
      { name: "LinkedIn", icon: Linkedin, href: "#" },
      { name: "Facebook", icon: Facebook, href: "#" },
    ],
  };

  return (
    <footer className="bg-primary py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <a href="#home" className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <Truck className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <span className="font-heading font-bold text-xl text-primary-foreground">Frete</span>
                <span className="font-heading font-bold text-xl text-accent">Certo</span>
              </div>
            </a>
            <p className="text-primary-foreground/70 leading-relaxed">
              Soluções completas em transporte rodoviário de cargas. 
              Sua carga no destino certo, sempre no prazo.
            </p>
          </div>

          {/* Services Links */}
          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-5">
              Serviços
            </h4>
            <ul className="space-y-3">
              {links.services.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-5">
              Empresa
            </h4>
            <ul className="space-y-3">
              {links.company.map((link) => (
                <li key={link.name}>
                  <a 
                    href={link.href}
                    className="text-primary-foreground/70 hover:text-accent transition-colors"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & Contact */}
          <div>
            <h4 className="font-heading font-semibold text-primary-foreground mb-5">
              Redes Sociais
            </h4>
            <div className="flex gap-3 mb-6">
              {links.social.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  aria-label={social.name}
                  className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-accent transition-colors group"
                >
                  <social.icon className="w-5 h-5 text-primary-foreground group-hover:text-accent-foreground transition-colors" />
                </a>
              ))}
            </div>
            <p className="text-primary-foreground/70 text-sm">
              CNPJ: 00.000.000/0001-00
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/60 text-sm">
            © {currentYear} Frete Certo. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="text-primary-foreground/60 hover:text-accent transition-colors">
              Política de Privacidade
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
