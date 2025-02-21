import { CreateUserDto } from 'src/user/dto/create-user.dto';

const CONFIG = {
  ROLES: {
    SYS: {
      codigo: 'SYS',
      cantidad: 2,
      nombre: 'Sistema',
    },
    REC: {
      codigo: 'REC',
      cantidad: 5,
      nombre: 'Recepción',
    },
    GVE: {
      codigo: 'GVE',
      cantidad: 3,
      nombre: 'Gerente de ventas',
    },
    VEN: {
      codigo: 'VEN',
      cantidad: 10,
      nombre: 'Ventas',
    },
    SCO: {
      codigo: 'SCO',
      cantidad: 2,
      nombre: 'Supervisor de Cobranza',
    },
    COB: {
      codigo: 'COB',
      cantidad: 5,
      nombre: 'Cobranza',
    },
    FIN: {
      codigo: 'FIN',
      cantidad: 3,
      nombre: 'Finanzas',
    },
    ADM: {
      codigo: 'ADM',
      cantidad: 2,
      nombre: 'Administrador',
    },
  },
  DATOS: {
    nombres: [
      'Ana',
      'María',
      'Carmen',
      'Laura',
      'Patricia',
      'Sofia',
      'Lucía',
      'Roberto',
      'Carlos',
      'Miguel',
      'Fernando',
      'Javier',
      'Luis',
      'José',
      'Daniel',
      'Jorge',
      'Alberto',
      'Ricardo',
      'Andrés',
      'César',
      'Eduardo',
    ],
    apellidos: [
      'García',
      'Rodríguez',
      'López',
      'Martínez',
      'Sánchez',
      'Torres',
      'Flores',
      'Díaz',
      'Medina',
      'Castro',
      'Ramos',
      'Ortiz',
      'Vargas',
      'Mendoza',
      'Ruiz',
      'Jiménez',
      'Prado',
      'Vega',
      'Miranda',
      'Ríos',
    ],
    password: 'Huertas2025',
    dominio: 'inmobiliariahuertas.com',
  },
};

class GeneradorIdentificadoresUnicos {
  private contadorDNI = 10000000;
  private emailsGenerados = new Set<string>();

  generarDocumento(): string {
    this.contadorDNI++;
    return this.contadorDNI.toString();
  }

  private normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
  }

  generarEmail(nombre: string, apellido: string): string {
    let email: string;
    let contador = 0;

    do {
      if (contador === 0) {
        email = `${this.normalizarTexto(nombre)}.${this.normalizarTexto(apellido)}@${CONFIG.DATOS.dominio}`;
      } else {
        email = `${this.normalizarTexto(nombre)}.${this.normalizarTexto(apellido)}${contador}@${CONFIG.DATOS.dominio}`;
      }
      contador++;
    } while (this.emailsGenerados.has(email));

    this.emailsGenerados.add(email);
    return email;
  }
}

class GeneradorDatos {
  private generadorIds = new GeneradorIdentificadoresUnicos();

  private getRandomFromArray<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private generarDatosBasicos() {
    const firstName = this.getRandomFromArray(CONFIG.DATOS.nombres);
    const lastName = this.getRandomFromArray(CONFIG.DATOS.apellidos);
    const document = this.generadorIds.generarDocumento();
    const email = this.generadorIds.generarEmail(firstName, lastName);

    return { firstName, lastName, document, email };
  }

  private crearUsuario(rolData: { codigo: string; id: number }): CreateUserDto {
    const datosBasicos = this.generarDatosBasicos();

    return {
      email: datosBasicos.email,
      password: CONFIG.DATOS.password,
      document: datosBasicos.document,
      firstName: datosBasicos.firstName,
      lastName: datosBasicos.lastName,
      roleId: rolData.id,
    };
  }

  generarUsuarios(
    rolData: { codigo: string; id: number },
    cantidad: number,
  ): CreateUserDto[] {
    return Array.from({ length: cantidad }, () => this.crearUsuario(rolData));
  }
}

// Tipo para el mapeo de códigos a IDs
type RoleIdMap = {
  [key: string]: number;
};

export const UsersData = (roleIdMap: RoleIdMap) => {
  const generador = new GeneradorDatos();
  const usuarios = {};

  // Generar usuarios para cada rol usando los IDs reales
  Object.entries(CONFIG.ROLES).forEach(([key, rol]) => {
    const roleId = roleIdMap[rol.codigo];
    if (roleId) {
      usuarios[key.toLowerCase()] = generador.generarUsuarios(
        { codigo: rol.codigo, id: roleId },
        rol.cantidad,
      );
    }
  });

  return usuarios;
};
