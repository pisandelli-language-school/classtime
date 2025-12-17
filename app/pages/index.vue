<script setup lang="ts">
const handleLogTime = () => {
  alert('Open Log Time Modal');
}
</script>

<template>
  <div class="h-full grid grid-rows-[auto_1fr_auto] min-h-0">
    <!-- Secondary Header / Controls -->
    <div class="flex-none border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
      <div class="max-w-[1600px] mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
        <!-- Date Navigation -->
        <div
          class="flex items-center gap-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 pl-4 pr-1 shadow-sm">
          <span class="text-sm font-bold whitespace-nowrap text-slate-700 dark:text-slate-200">Oct 16 - Oct 22,
            2023</span>
          <div class="flex gap-1">
            <button
              class="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400">
              <span class="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button
              class="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400">
              <span class="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>

        <!-- Weekly Goal Progress -->
        <div class="flex items-center gap-6 flex-1 justify-end max-w-md w-full">
          <div class="flex flex-col w-full gap-2">
            <div class="flex justify-between items-end">
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Weekly
                Goal</span>
              <div class="text-sm font-medium">
                <span class="font-bold text-slate-900 dark:text-white">32h</span>
                <span class="text-slate-400">/ 40h</span>
              </div>
            </div>
            <div class="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full" style="width: 80%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Timesheet Grid -->
    <main class="overflow-x-auto overflow-y-hidden bg-background-light dark:bg-background-dark p-6 min-h-0">
      <div class="h-full min-w-[1000px] mx-auto max-w-[1600px] grid grid-cols-5 gap-4">

        <!-- Monday -->
        <div class="flex flex-col h-full gap-4 group/col">
          <div
            class="flex flex-col gap-2 p-3 rounded-md bg-white/50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div class="flex justify-between items-center">
              <span class="text-base font-bold text-slate-900 dark:text-white">Mon 16</span>
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400">6h</span>
            </div>
            <div class="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full" style="width: 75%"></div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 pb-20 scrollbar-custom">
            <!-- Card 1 -->
            <div
              class="flex flex-col gap-2 p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group/card">
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-sm text-slate-900 dark:text-white">Alice M.</h3>
                <span
                  class="bg-primary/10 text-primary dark:text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded-full">1.5h</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                Math tutoring - Algebra basics. Reviewing quadratic equations.
              </div>
              <div class="mt-1 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                <span class="material-symbols-outlined text-[14px]">schedule</span> 9:00 AM - 10:30 AM
              </div>
            </div>

            <!-- Card 2 -->
            <div
              class="flex flex-col gap-2 p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group/card">
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-sm text-slate-900 dark:text-white">Grade 10 Biology</h3>
                <span
                  class="bg-primary/10 text-primary dark:text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded-full">2.5h</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                Lab preparation and grading mid-term exams.
              </div>
              <div class="mt-1 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                <span class="material-symbols-outlined text-[14px]">schedule</span> 11:00 AM - 1:30 PM
              </div>
            </div>

            <!-- Card 3 -->
            <div
              class="flex flex-col gap-2 p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group/card">
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-sm text-slate-900 dark:text-white">Staff Meeting</h3>
                <span
                  class="bg-primary/10 text-primary dark:text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded-full">2h</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                Weekly curriculum alignment sync.
              </div>
              <div class="mt-1 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                <span class="material-symbols-outlined text-[14px]">schedule</span> 2:00 PM - 4:00 PM
              </div>
            </div>

            <button @click="handleLogTime"
              class="group flex items-center justify-center gap-2 w-full p-3 rounded-md border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary hover:border-primary/50 transition-all">
              <span class="material-symbols-outlined text-lg">add</span>
              <span class="text-xs font-medium">Log Time</span>
            </button>
          </div>
        </div>

        <!-- Tuesday -->
        <div class="flex flex-col h-full gap-4 group/col">
          <div
            class="flex flex-col gap-2 p-3 rounded-md bg-white/50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div class="flex justify-between items-center">
              <span class="text-base font-bold text-slate-900 dark:text-white">Tue 17</span>
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400">7.5h</span>
            </div>
            <div class="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full" style="width: 90%"></div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 pb-20 scrollbar-custom">
            <!-- Card 1 -->
            <div
              class="flex flex-col gap-2 p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group/card">
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-sm text-slate-900 dark:text-white">Physics Lab</h3>
                <span
                  class="bg-primary/10 text-primary dark:text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded-full">4h</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                Advanced Mechanics lab supervision.
              </div>
              <div class="mt-1 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                <span class="material-symbols-outlined text-[14px]">schedule</span> 8:00 AM - 12:00 PM
              </div>
            </div>

            <button @click="handleLogTime"
              class="group flex items-center justify-center gap-2 w-full p-3 rounded-md border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary hover:border-primary/50 transition-all">
              <span class="material-symbols-outlined text-lg">add</span>
              <span class="text-xs font-medium">Log Time</span>
            </button>
          </div>
        </div>

        <!-- Wednesday -->
        <div class="flex flex-col h-full gap-4 group/col">
          <div
            class="flex flex-col gap-2 p-3 rounded-md bg-white/50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div class="flex justify-between items-center">
              <span class="text-base font-bold text-slate-900 dark:text-white">Wed 18</span>
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400">4h</span>
            </div>
            <div class="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <!-- Orange bar from original HTML preserved/adapted -->
              <div class="h-full bg-orange-400 rounded-full" style="width: 50%"></div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 pb-20 scrollbar-custom">
            <!-- Card 1 -->
            <div
              class="flex flex-col gap-2 p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group/card">
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-sm text-slate-900 dark:text-white">Admin Work</h3>
                <span
                  class="bg-primary/10 text-primary dark:text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded-full">4h</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                Report card generation and parent emails.
              </div>
              <div class="mt-1 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                <span class="material-symbols-outlined text-[14px]">schedule</span> 9:00 AM - 1:00 PM
              </div>
            </div>

            <button @click="handleLogTime"
              class="group flex items-center justify-center gap-2 w-full p-3 rounded-md border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary hover:border-primary/50 transition-all">
              <span class="material-symbols-outlined text-lg">add</span>
              <span class="text-xs font-medium">Log Time</span>
            </button>
          </div>
        </div>

        <!-- Thursday -->
        <div class="flex flex-col h-full gap-4 group/col">
          <div
            class="flex flex-col gap-2 p-3 rounded-md bg-white/50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div class="flex justify-between items-center">
              <span class="text-base font-bold text-slate-900 dark:text-white">Thu 19</span>
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400">8h</span>
            </div>
            <div class="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full" style="width: 100%"></div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 pb-20 scrollbar-custom">
            <!-- Card 1 -->
            <div
              class="flex flex-col gap-2 p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group/card">
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-sm text-slate-900 dark:text-white">Exam Prep</h3>
                <span
                  class="bg-primary/10 text-primary dark:text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded-full">3h</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                Creating materials for final exams.
              </div>
              <div class="mt-1 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                <span class="material-symbols-outlined text-[14px]">schedule</span> 3:30 PM - 6:30 PM
              </div>
            </div>

            <button @click="handleLogTime"
              class="group flex items-center justify-center gap-2 w-full p-3 rounded-md border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary hover:border-primary/50 transition-all">
              <span class="material-symbols-outlined text-lg">add</span>
              <span class="text-xs font-medium">Log Time</span>
            </button>
          </div>
        </div>

        <!-- Friday -->
        <div class="flex flex-col h-full gap-4 group/col">
          <div
            class="flex flex-col gap-2 p-3 rounded-md bg-white/50 dark:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div class="flex justify-between items-center">
              <span class="text-base font-bold text-slate-900 dark:text-white">Fri 20</span>
              <span class="text-xs font-medium text-slate-500 dark:text-slate-400">6.5h</span>
            </div>
            <div class="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-primary rounded-full" style="width: 80%"></div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto pr-2 flex flex-col gap-3 pb-20 scrollbar-custom">
            <!-- Card 1 -->
            <div
              class="flex flex-col gap-2 p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/50 cursor-pointer transition-all group/card">
              <div class="flex justify-between items-start">
                <h3 class="font-bold text-sm text-slate-900 dark:text-white">Review</h3>
                <span
                  class="bg-primary/10 text-primary dark:text-primary-400 text-[10px] font-bold px-2 py-0.5 rounded-full">2.5h</span>
              </div>
              <div class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                Reviewing student progress logs.
              </div>
              <div class="mt-1 flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                <span class="material-symbols-outlined text-[14px]">schedule</span> 2:00 PM - 4:30 PM
              </div>
            </div>

            <button @click="handleLogTime"
              class="group flex items-center justify-center gap-2 w-full p-3 rounded-md border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary hover:border-primary/50 transition-all">
              <span class="material-symbols-outlined text-lg">add</span>
              <span class="text-xs font-medium">Log Time</span>
            </button>
          </div>
        </div>

      </div>
    </main>

    <!-- Sticky Footer -->
    <div
      class="flex-none bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 flex justify-end z-20">
      <div class="flex gap-4">
        <button
          class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-transparent border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span class="truncate">Save Draft</span>
        </button>
        <button
          class="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-6 bg-primary hover:bg-primary-600 text-white text-sm font-bold shadow-lg shadow-primary/30 transition-all">
          <span class="truncate">Submit Week for Approval</span>
        </button>
      </div>
    </div>
  </div>
</template>
