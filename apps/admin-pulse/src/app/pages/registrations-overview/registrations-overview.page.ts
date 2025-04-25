import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistrationsService } from '../../services/registrations.service';
import { UsersService } from '../../services/users.service';
import { RelationsService } from '../../services/relations.service';
import { RegistrationsOverviewStore } from './registrations-overview.store';
import { RegistrationsTableComponent } from '../../components/registrations-table/registrations-table.component';
import { RelationHeaderComponent } from '../../components/relation-header/relation-header.component';

@Component({
  selector: 'ap-registrations-overview',
  imports: [CommonModule, RegistrationsTableComponent, RelationHeaderComponent],
  templateUrl: './registrations-overview.page.html',
  styleUrl: './registrations-overview.page.scss',
  providers: [RegistrationsOverviewStore],
})
export class RegistrationsOverviewPage {
  readonly #registrationsService = inject(RegistrationsService);
  readonly #usersService = inject(UsersService);
  readonly #relationsService = inject(RelationsService);
  readonly #store = inject(RegistrationsOverviewStore);

  printStore = effect(() => {
    const hierarchy = this.#store.hierarchy();
    const users = this.#store.userEntities();
    const registrations = this.#store.registrationEntities();

    console.log({ hierarchy, users, registrations });
  });

  relationsWithRegistrations = this.#store.relationsWithRegistrations;
  hierarchy = this.#store.hierarchy;

  print() {
    window.print();
  }

  // #gridApi!: GridApi;

  // onGridReady(params: { api: GridApi }) {
  //   this.#gridApi = params.api;
  // }
  //
  // onBtnExport() {
  //   this.#gridApi.exportDataAsExcel({
  //     // processRowGroupCallback: rowGroupCallback,
  //   });
  // }
  //
  // registrationsResource = rxResource<RegistrationDto[], unknown>({
  //   request: () => ({}),
  //   loader: () =>
  //     this.#registrationsService
  //       .listRegistrations()
  //       .pipe(map((page) => page.results)),
  // });

  // usersResource = rxResource<UserDto[], unknown>({
  //   request: () => ({}),
  //   loader: () =>
  //     this.#usersService.listUsers().pipe(map((page) => page.results)),
  // });
  //
  // relationsResource = rxResource<RelationDto[], unknown>({
  //   request: () => ({}),
  //   loader: () =>
  //     this.#relationsService
  //       .listAllRelations()
  //       .pipe(map((page) => page.results)),
  // });
  //
  // priceListItemsResource = rxResource<PriceListItemDto[], unknown>({
  //   request: () => ({}),
  //   loader: () => this.#registrationsService.listPriceListItems(),
  // });

  // priceListItemsHierarchyResource = rxResource<
  //   PriceListItemsHierarchyDto,
  //   unknown
  // >({
  //   request: () => ({}),
  //   loader: () => this.#registrationsService.listPriceListItemsHierarchy(),
  // });

  // columnDefs: ColDef[] = [
  //   { field: 'relationName', rowGroup: true, hide: true },
  //   { field: 'group', rowGroup: true, hide: true },
  //   { field: 'subGroup', rowGroup: true, hide: true },
  //   { field: 'childName', rowGroup: true, hide: true },
  //   { field: 'duration' },
  //   { field: 'remarkInternal' },
  //   { field: 'userName' },
  //   { field: 'unitPrice' },
  // ];
  //
  // defaultColDef: ColDef = {
  //   flex: 1,
  // };

  // autoGroupColumnDef: ColDef = {
  //   headerName: 'Hierarchy',
  //   cellClass: getIndentClass,
  //   minWidth: 300,
  //   cellRendererParams: {
  //     suppressCount: true,
  //   },
  // };

  // rowData = computed(() => {
  //   const hierarchy = this.priceListItemsHierarchyResource.value();
  //   const registrations = this.registrationsResource.value();
  //   const users = this.usersResource.value();
  //   const relations = this.relationsResource.value();
  //
  //   if (hierarchy && registrations && users && relations) {
  //     const paths = hierarchy
  //       .map((parent) =>
  //         parent.items.map((child) => ({
  //           // path: [...parent.name.split(' - '), child.name],
  //           group: parent.name.split(' - ')[0],
  //           subGroup: parent.name.split(' - ')[1],
  //           childName: child.name,
  //           code: child.code,
  //         }))
  //       )
  //       .flat();
  //
  //     const pathsWithRegistrations = paths
  //       .map((currentPath) => {
  //         const allowedRegistrations = registrations.filter(
  //           (registration) =>
  //             registration.priceListItemCode === currentPath.code
  //         );
  //
  //         return allowedRegistrations.map((registration) => ({
  //           ...registration,
  //           ...currentPath,
  //           userName: users.find((user) => user.id === registration.userId)
  //             ?.name,
  //           relationName: relations.find(
  //             (relation) =>
  //               relation.uniqueIdentifier === registration.relationIdentifier
  //           )?.displayName,
  //           registrationId: registration.id,
  //           // path: [...currentPath.path, registration.id],
  //         }));
  //       })
  //       .flat();
  //     console.log(pathsWithRegistrations);
  //     return pathsWithRegistrations;
  //   }
  //
  //   return [];
  // });

  // groupDefaultExpanded = -1;
  //
  // getDataPath = (data: any) => data.path;
  //
  // excelStyles: ExcelStyle[] = [
  //   {
  //     id: 'indent-1',
  //     alignment: {
  //       indent: 1,
  //     },
  //     // note, dataType: 'string' required to ensure that numeric values aren't right-aligned
  //     dataType: 'String',
  //   },
  //   {
  //     id: 'indent-2',
  //     alignment: {
  //       indent: 2,
  //     },
  //     dataType: 'String',
  //   },
  //   {
  //     id: 'indent-3',
  //     alignment: {
  //       indent: 3,
  //     },
  //     dataType: 'String',
  //   },
  // ];
}
