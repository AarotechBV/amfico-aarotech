import {
  patchState,
  signalStore,
  type,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  entityConfig,
  removeAllEntities,
  setEntities,
  withEntities,
} from '@ngrx/signals/entities';
import { UserDto } from '../../models/user.dto';
import { RegistrationDto } from '../../models/registration.dto';
import { RelationDto } from '../../models/relation.dto';
import { PriceListItemsHierarchyDto } from '../../models/price-list-items-hierarchy.dto';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, expand, pipe, switchMap, tap } from 'rxjs';
import { computed, inject } from '@angular/core';
import { RegistrationsService } from '../../services/registrations.service';
import { tapResponse } from '@ngrx/operators';
import { UsersService } from '../../services/users.service';
import { RelationsService } from '../../services/relations.service';
import {
  Relation,
  RelationWithInvoicesSchedules,
} from '../../models/relation.model';
import { Hierarchy } from '../../models/hierarchy.model';
import { RegistrationsRequestDto } from '../../models/registrations-request.dto';
import { CompanyDto } from '../../models/company.dto';
import { CompaniesService } from '../../services/companies.service';
import { InvoicesScheduleDto } from '../../models/invoices-schedule.dto';
import { compareRelations } from '../../utils/compare-relations.util';
import { InvoiceDto } from '../../models/invoice.dto';
import { InvoicesRequestDto } from '../../models/invoices-request.dto';
import { InvoicesService } from '../../services/invoices.service';
import { parseDateFromString } from '../../utils/parse-date-from-string.util';
import { ASSIGNMENT_BLACKLIST } from '../../constants';

type RegistrationsOverviewState = {
  _hierarchy: PriceListItemsHierarchyDto | null;
  _loading: number;
  errors: string[];
};

const initialState: RegistrationsOverviewState = {
  _hierarchy: null,
  _loading: 0,
  errors: [],
};

const errorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
};

const userConfig = entityConfig({
  entity: type<UserDto>(),
  collection: 'user',
  selectId: (user) => user.id,
});

const registrationConfig = entityConfig({
  entity: type<RegistrationDto>(),
  collection: 'registration',
  selectId: (registration) => registration.id,
});

const invoiceConfig = entityConfig({
  entity: type<InvoiceDto>(),
  collection: 'invoice',
  selectId: (invoice) => invoice.id,
});

const relationConfig = entityConfig({
  entity: type<RelationDto>(),
  collection: 'relation',
  selectId: (relation) => relation.uniqueIdentifier,
});

const invoicesScheduleConfig = entityConfig({
  entity: type<InvoicesScheduleDto>(),
  collection: 'invoicesSchedule',
  selectId: (invoicesSchedule) => invoicesSchedule.id,
});

const companyConfig = entityConfig({
  entity: type<CompanyDto>(),
  collection: 'company',
  selectId: (company) => company.id,
});

export const RegistrationsOverviewStore = signalStore(
  withState(initialState),
  withEntities(userConfig),
  withEntities(registrationConfig),
  withEntities(relationConfig),
  withEntities(companyConfig),
  withEntities(invoicesScheduleConfig),
  withEntities(invoiceConfig),
  withComputed(
    ({
      _loading,
      _hierarchy,
      registrationEntities,
      userEntityMap,
      relationEntities,
      relationEntityMap,
      companyEntityMap,
      invoicesScheduleEntities,
      invoiceEntities,
    }) => {
      const isLoading = computed(() => _loading() > 0);

      const hierarchy = computed((): Hierarchy => {
        const raw = _hierarchy();
        if (!raw) return [];
        return raw.reduce((acc, item) => {
          const [category, subCategory] = item.name.split(' - ');
          const children = item.items.map((i) => ({
            child: i.name,
            id: i.id,
          }));

          const existing = acc.find((c) => c.category === category);
          if (existing) {
            existing.subCategories.push({
              subCategory,
              id: item.id,
              children,
            });
          } else {
            acc.push({
              category,
              subCategories: [{ id: item.id, subCategory, children }],
            });
          }
          return acc;
        }, [] as Hierarchy);
      });

      const identifiersInvoicedOnOtherRelations = computed((): string[] =>
        invoicesScheduleEntities().flatMap((schedule) =>
          schedule.invoicedOnBehalfOf.filter(
            (identifier) => identifier !== schedule.relationIdentifier,
          ),
        ),
      );

      const relationsWithInvoicesSchedules = computed(
        (): RelationWithInvoicesSchedules[] => {
          const relationDtos = relationEntities();
          const relationMap = relationEntityMap();
          const companyMap = companyEntityMap();
          const schedules = invoicesScheduleEntities();
          const identifiersToRemove = identifiersInvoicedOnOtherRelations();

          return relationDtos
            .filter((r) => !identifiersToRemove.includes(r.uniqueIdentifier))
            .sort(compareRelations)
            .map((relationDto) => {
              const invoicedOnBehalfOfIdentifiers = [
                ...new Set(
                  schedules
                    .filter(
                      (s) =>
                        s.relationIdentifier === relationDto.uniqueIdentifier,
                    )
                    .flatMap((s) => s.invoicedOnBehalfOf),
                ),
              ];

              const invoicedOnBehalfOfCodes = invoicedOnBehalfOfIdentifiers
                .map((identifier) => relationMap[identifier]?.code)
                .filter((code): code is string => code !== undefined);

              return {
                ...relationDto,
                invoicedOnBehalfOfIdentifiers,
                invoicedOnBehalfOfCodes,
                company: companyMap[relationDto.companyId],
              };
            });
        },
      );

      const filteredRegistrationsBasedOnAssignments = computed(
        (): RegistrationDto[] =>
          registrationEntities().filter(
            (registration) =>
              !ASSIGNMENT_BLACKLIST.includes(
                registration.assignmentTemplateName,
              ),
          ),
      );

      const relationsWithRegistrations = computed((): Relation[] => {
        const relations = relationsWithInvoicesSchedules();
        const registrations = filteredRegistrationsBasedOnAssignments();
        const invoices = invoiceEntities();
        const users = userEntityMap();

        return relations
          .map((relation) => ({
            ...relation,
            registrations: registrations
              .filter((registration) =>
                [
                  relation.uniqueIdentifier,
                  ...relation.invoicedOnBehalfOfIdentifiers,
                ].includes(registration.relationIdentifier),
              )
              .map((registration) => ({
                ...registration,
                user: users[registration.userId],
              })),
            invoices: invoices
              .filter(
                (invoice) =>
                  invoice.relationIdentifier === relation.uniqueIdentifier,
              )
              .map((invoice) => ({
                ...invoice,
                dueDateAsDate: parseDateFromString(invoice.dueDate),
              })),
          }))
          .filter((relation) => relation.registrations.length > 0);
      });

      return {
        isLoading,
        hierarchy,
        relationsWithRegistrations,
        relationsWithInvoicesSchedules,
        identifiersInvoicedOnOtherRelations,
      };
    },
  ),
  withMethods(
    (
      store,
      registrationsService = inject(RegistrationsService),
      invoicesService = inject(InvoicesService),
      usersService = inject(UsersService),
      relationsService = inject(RelationsService),
      companiesService = inject(CompaniesService),
    ) => {
      const incLoading = () =>
        patchState(store, (s) => ({ _loading: s._loading + 1 }));
      const decLoading = () =>
        patchState(store, (s) => ({ _loading: s._loading - 1 }));
      const pushError = (scope: string) => (err: unknown) => {
        console.error(scope, err);
        patchState(store, (s) => ({
          errors: [...s.errors, `${scope}: ${errorMessage(err)}`],
        }));
      };
      const clearErrors = () => patchState(store, { errors: [] });

      const loadHierarchy = rxMethod<void>(
        pipe(
          tap(() => incLoading()),
          switchMap(() =>
            registrationsService.listPriceListItemsHierarchy().pipe(
              tapResponse({
                next: (hierarchy) =>
                  patchState(store, { _hierarchy: hierarchy }),
                error: pushError('hierarchy'),
                finalize: decLoading,
              }),
            ),
          ),
        ),
      );

      const loadCompanies = rxMethod<void>(
        pipe(
          tap(() => incLoading()),
          switchMap(() =>
            companiesService.listAllCompanies().pipe(
              tapResponse({
                next: (companies) =>
                  patchState(store, setEntities(companies, companyConfig)),
                error: pushError('companies'),
                finalize: decLoading,
              }),
            ),
          ),
        ),
      );

      const loadUsers = rxMethod<void>(
        pipe(
          tap(() => {
            incLoading();
            patchState(store, removeAllEntities(userConfig));
          }),
          switchMap(() =>
            usersService.listUsers(0).pipe(
              expand((page) =>
                page.currentPage < page.pageCount
                  ? usersService.listUsers(page.currentPage + 1)
                  : EMPTY,
              ),
              tapResponse({
                next: (page) =>
                  patchState(store, setEntities(page.results, userConfig)),
                error: pushError('users'),
                finalize: decLoading,
              }),
            ),
          ),
        ),
      );

      const loadRelations = rxMethod<void>(
        pipe(
          tap(() => {
            incLoading();
            patchState(store, removeAllEntities(relationConfig));
          }),
          switchMap(() =>
            relationsService.listAllRelations(0).pipe(
              expand((page) =>
                page.currentPage < page.pageCount
                  ? relationsService.listAllRelations(page.currentPage + 1)
                  : EMPTY,
              ),
              tapResponse({
                next: (page) =>
                  patchState(store, setEntities(page.results, relationConfig)),
                error: pushError('relations'),
                finalize: decLoading,
              }),
            ),
          ),
        ),
      );

      const loadInvoicesSchedules = rxMethod<void>(
        pipe(
          tap(() => {
            incLoading();
            patchState(store, removeAllEntities(invoicesScheduleConfig));
          }),
          switchMap(() =>
            relationsService.listAllInvoicesSchedules(0).pipe(
              expand((page) =>
                page.currentPage < page.pageCount
                  ? relationsService.listAllInvoicesSchedules(
                      page.currentPage + 1,
                    )
                  : EMPTY,
              ),
              tapResponse({
                next: (page) =>
                  patchState(
                    store,
                    setEntities(page.results, invoicesScheduleConfig),
                  ),
                error: pushError('invoicesSchedules'),
                finalize: decLoading,
              }),
            ),
          ),
        ),
      );

      const loadRegistrations = rxMethod<RegistrationsRequestDto>(
        pipe(
          tap(() => {
            incLoading();
            patchState(store, removeAllEntities(registrationConfig));
          }),
          switchMap((request) =>
            registrationsService.listRegistrations(request, 0).pipe(
              expand((page) =>
                page.currentPage < page.pageCount
                  ? registrationsService.listRegistrations(
                      request,
                      page.currentPage + 1,
                    )
                  : EMPTY,
              ),
              tapResponse({
                next: (page) =>
                  patchState(
                    store,
                    setEntities(
                      page.results.filter(
                        (registration) =>
                          registration.neverInvoice === request.neverInvoice &&
                          !registration.inFixedAmount,
                      ),
                      registrationConfig,
                    ),
                  ),
                error: pushError('registrations'),
                finalize: decLoading,
              }),
            ),
          ),
        ),
      );

      const loadInvoices = rxMethod<InvoicesRequestDto>(
        pipe(
          tap(() => {
            incLoading();
            patchState(store, removeAllEntities(invoiceConfig));
          }),
          switchMap((request) =>
            invoicesService.listAllInvoices(request, 0).pipe(
              expand((page) =>
                page.currentPage < page.pageCount
                  ? invoicesService.listAllInvoices(
                      request,
                      page.currentPage + 1,
                    )
                  : EMPTY,
              ),
              tapResponse({
                next: (page) =>
                  patchState(store, setEntities(page.results, invoiceConfig)),
                error: pushError('invoices'),
                finalize: decLoading,
              }),
            ),
          ),
        ),
      );

      return {
        loadHierarchy,
        loadUsers,
        loadRegistrations,
        loadRelations,
        loadCompanies,
        loadInvoicesSchedules,
        loadInvoices,
        clearErrors,
      };
    },
  ),
  withHooks({
    onInit(store) {
      store.loadHierarchy();
      store.loadCompanies();
      store.loadUsers();
      store.loadRelations();
      store.loadInvoicesSchedules();
    },
  }),
);
