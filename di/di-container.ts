import { Container, ContainerModule } from 'inversify';

export type DiModule = ContainerModule;

export function symbolFor<T>(name: string): symbol {
  return Symbol.for(name);
}

export function setupDi(modules: DiModule[]): Container {
  const container = new Container();
  container.load(...modules);
  return container;
}
